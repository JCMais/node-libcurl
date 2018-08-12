/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <functional>
#include <sstream>

#include "Easy.h"
#include "Share.h"

#include "make_unique.h"

// 36055 was allocated on Win64
#define MEMORY_PER_HANDLE 30000

namespace NodeLibcurl {

    class Easy::ToFree {
    public:
        std::vector<std::vector<char> >             str;
        std::vector<curl_slist*>                    slist;
        std::vector<std::unique_ptr<CurlHttpPost> > post;

        ~ToFree() {
            for ( unsigned int i = 0; i < slist.size(); i++ ) {
                curl_slist_free_all( slist[i] );
            }
        }
    };

    Nan::Persistent<v8::FunctionTemplate> Easy::constructor;
    Nan::Persistent<v8::String> Easy::onDataCbSymbol;
    Nan::Persistent<v8::String> Easy::onHeaderCbSymbol;

    uint32_t Easy::counter = 0;
    uint32_t Easy::currentOpenedHandles = 0;

    Easy::Easy()
    {
        this->ch = curl_easy_init();
        assert( this->ch && "Could not initialize libcurl easy handle." );

        NODE_LIBCURL_ADJUST_MEM( MEMORY_PER_HANDLE );

        this->toFree = std::make_shared<Easy::ToFree>();

        this->ResetRequiredHandleOptions();

        ++Easy::currentOpenedHandles;
    }

    Easy::Easy( Easy *orig )
    {
        assert( orig );
        assert( orig != this ); //should not duplicate itself

        this->ch = curl_easy_duphandle( orig->ch );
        assert( this->ch && "Could not duplicate libcurl easy handle." );

        NODE_LIBCURL_ADJUST_MEM( MEMORY_PER_HANDLE );

        Nan::HandleScope scope;

        // copy the orig callbacks to the current handle
        this->callbacks.insert( orig->callbacks.begin(), orig->callbacks.end() );

        if ( orig->cbOnSocketEvent ) {
            this->cbOnSocketEvent = orig->cbOnSocketEvent;
        }

        // make sure to reset the *DATA options when duplicating a handle. We are setting all of them, even if they are not set.
        curl_easy_setopt( this->ch, CURLOPT_CHUNK_DATA, this );
        curl_easy_setopt( this->ch, CURLOPT_DEBUGDATA, this );
        curl_easy_setopt( this->ch, CURLOPT_FNMATCH_DATA, this );
        curl_easy_setopt( this->ch, CURLOPT_PROGRESSDATA, this );
#if NODE_LIBCURL_VER_GE( 7, 32, 0 )
        curl_easy_setopt( this->ch, CURLOPT_XFERINFODATA, this );
#endif
        // no need to reset the _DATA option for the READ, SEEK and WRITE callbacks, since they are reset on ResetRequiredHandleOptions()

        this->toFree = orig->toFree;

        this->ResetRequiredHandleOptions();

        ++Easy::currentOpenedHandles;
    }

    // Implementation of equality operator overload.
    bool Easy::operator==( const Easy &other ) const
    {
        return this->ch == other.ch;
    }

    bool Easy::operator!=( const Easy &other ) const
    {
        return !( *this == other );
    }

    Easy::~Easy( void )
    {
        if ( this->isOpen ) {

            this->Dispose();
        }
    }

    void Easy::ResetRequiredHandleOptions()
    {
        curl_easy_setopt( this->ch, CURLOPT_PRIVATE, this ); // to be used with Multi handle

        curl_easy_setopt( this->ch, CURLOPT_HEADERFUNCTION, Easy::HeaderFunction );
        curl_easy_setopt( this->ch, CURLOPT_HEADERDATA,     this );

        curl_easy_setopt( this->ch, CURLOPT_READFUNCTION, Easy::ReadFunction );
        curl_easy_setopt( this->ch, CURLOPT_READDATA,     this );

        curl_easy_setopt( this->ch, CURLOPT_SEEKFUNCTION, Easy::SeekFunction );
        curl_easy_setopt( this->ch, CURLOPT_SEEKDATA,     this );

        curl_easy_setopt( this->ch, CURLOPT_WRITEFUNCTION, Easy::WriteFunction );
        curl_easy_setopt( this->ch, CURLOPT_WRITEDATA,     this );
    }

    // Dispose persistent objects and references stored during the life of this obj.
    void Easy::Dispose()
    {
        // this call should only be done when the handle is still open
        assert( this->isOpen && "This handle was already closed." );
        assert( this->ch && "The curl handle ran away." );

        curl_easy_cleanup( this->ch );

        NODE_LIBCURL_ADJUST_MEM( -MEMORY_PER_HANDLE );

        if ( this->isMonitoringSockets ) {
            this->UnmonitorSockets();
        }

        this->isOpen = false;

        --Easy::currentOpenedHandles;
    }

    void Easy::MonitorSockets()
    {
        int retUv;
        CURLcode retCurl;
        int events = 0 | UV_READABLE | UV_WRITABLE;

        if ( this->socketPollHandle ) {

            Nan::ThrowError( "Already monitoring sockets!" );
            return;
        }

#if NODE_LIBCURL_VER_GE( 7, 45, 0 )
        curl_socket_t socket;
        retCurl = curl_easy_getinfo( this->ch, CURLINFO_ACTIVESOCKET, &socket );

        if ( socket == CURL_SOCKET_BAD ) {

            Nan::ThrowError( "Received invalid socket from the current connection!" );
            return;
        }
#else
        long socket;
        retCurl = curl_easy_getinfo( this->ch, CURLINFO_LASTSOCKET, &socket );
#endif

        if ( retCurl != CURLE_OK ) {

            std::string errorMsg;

            errorMsg += std::string( "Failed to receive socket. Reason: " ) + curl_easy_strerror( retCurl );

            Nan::ThrowError( errorMsg.c_str() );
            return;
        }

        this->socketPollHandle = new uv_poll_t;

        retUv = uv_poll_init_socket( uv_default_loop(), this->socketPollHandle, socket );

        if ( retUv < 0 ) {

            std::string errorMsg;

            errorMsg += std::string( "Failed to poll on connection socket. Reason:" ) + UV_ERROR_STRING( retUv );

            Nan::ThrowError( errorMsg.c_str() );
            return;
        }

        this->socketPollHandle->data = this;

        retUv = uv_poll_start( this->socketPollHandle, events, Easy::OnSocket );
        this->isMonitoringSockets = true;
    }

    void Easy::UnmonitorSockets()
    {
        int retUv;
        retUv = uv_poll_stop( this->socketPollHandle );

        if ( retUv < 0 ) {

            std::string errorMsg;

            errorMsg += std::string( "Failed to stop polling on socket. Reason: " ) + UV_ERROR_STRING( retUv );

            Nan::ThrowError( errorMsg.c_str() );
            return;
        }

        uv_close( reinterpret_cast<uv_handle_t *>( this->socketPollHandle ), Easy::OnSocketClose );
        this->isMonitoringSockets = false;
    }

    void Easy::OnSocket( uv_poll_t* handle, int status, int events )
    {
        Easy *obj = static_cast<Easy*>( handle->data );

        assert( obj );

        obj->CallSocketEvent( status, events );
    }

    void Easy::OnSocketClose( uv_handle_t *handle )
    {
        delete handle;
    }

    void Easy::CallSocketEvent( int status, int events )
    {
        if ( this->cbOnSocketEvent == nullptr ) {
            return;
        }

        Nan::HandleScope scope;

        v8::Local<v8::Value> err = Nan::Null();

        if ( status < 0 ) {

            err = Nan::Error( UV_ERROR_STRING( status ) );
        }

        const int argc = 2;
        v8::Local<v8::Value> argv[] = {
            err,
            Nan::New<v8::Integer>( events )
        };

        Nan::Call( *(this->cbOnSocketEvent.get()), this->handle(), argc, argv );
    }

    // Called by libcurl when some chunk of data (from body) is available
    size_t Easy::WriteFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
    {
        Easy *obj = static_cast<Easy*>( userdata );
        return obj->OnData( ptr, size, nmemb );
    }

    // Called by libcurl when some chunk of data (from headers) is available
    size_t Easy::HeaderFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
    {
        Easy *obj = static_cast<Easy*>( userdata );
        return obj->OnHeader( ptr, size, nmemb );
    }

    // Called by libcurl as soon as it needs to read data in order to send it to the peer
    size_t Easy::ReadFunction( char *ptr, size_t size, size_t nmemb, void *userdata )
    {
        uv_fs_t readReq;

        int32_t ret = 0;

        Easy *obj = static_cast<Easy*>( userdata );
        int32_t fd = obj->readDataFileDescriptor;

        size_t n = size * nmemb;

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_READFUNCTION );

        // Read callback was set, use it instead
        if ( it != obj->callbacks.end() ) {

            Nan::HandleScope scope;

            v8::Local<v8::Object> buf = Nan::NewBuffer( static_cast<uint32_t>( n ) ).ToLocalChecked();
            v8::Local<v8::Uint32> sizeArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( size ) );
            v8::Local<v8::Uint32> nmembArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( nmemb ) );
            v8::Local<v8::Value> argv[] = { buf, sizeArg, nmembArg };

            v8::Local<v8::Value> retval = it->second->Call( obj->handle(), 3, argv );
            char *data = node::Buffer::Data( buf );

            ret = retval->Int32Value();

            bool hasData = !!data && ret > 0 && ret < CURL_READFUNC_ABORT;

            if ( hasData ) {

                std::memcpy( ptr, data, ret );
            }

        // otherwise use the default read callback
        } else {

            // abort early if we don't have a file descriptor
            if ( fd == -1 ) {
                return CURL_READFUNC_ABORT;
            }

            // get the offset
            curl_off_t offset = obj->readDataOffset;
            if  ( offset >= 0 ){
                // increment it for the next read
                obj->readDataOffset += n;
            }

#if UV_VERSION_MAJOR < 1
            ret = uv_fs_read( uv_default_loop(), &readReq, fd, ptr, n, offset, NULL );
#else
            uv_buf_t uvbuf = uv_buf_init( ptr, (unsigned int)( n ) );

            ret = uv_fs_read( uv_default_loop(), &readReq, fd, &uvbuf, 1, offset, NULL );
#endif
        }

        if ( ret < 0 ) {

            return CURL_READFUNC_ABORT;
        }

        return static_cast<size_t>( ret );
    }

    size_t Easy::SeekFunction( void *userdata, curl_off_t offset, int origin )
    {
        Easy *obj = static_cast<Easy*>( userdata );

        int32_t retValInt = CURL_SEEKFUNC_FAIL;

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_READFUNCTION );

        // Read callback was set, look for a seek callback
        if ( it != obj->callbacks.end() ) {
            it = obj->callbacks.find( CURLOPT_SEEKFUNCTION );

            // Seek callback was set, use it instead
            if ( it != obj->callbacks.end() ) {

                Nan::HandleScope scope;

                v8::Local<v8::Uint32> offsetArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( offset ) );
                v8::Local<v8::Uint32> originArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( origin ) );
                v8::Local<v8::Value> argv[] = { offsetArg, originArg };

                v8::Local<v8::Value> retVal = it->second->Call( obj->handle(), 2, argv );

                if ( !retVal->IsInt32() ) {

                    Nan::ThrowTypeError( "Return value from the SEEKFUNCTION callback must be an integer." );
                }
                else {

                    retValInt = retVal->Int32Value();
                }

            // otherwise we can't seek directly
            } else {

                retValInt = CURL_SEEKFUNC_CANTSEEK;
            }

        // otherwise use the default seek callback
        } else {

            obj->readDataOffset = offset;
            retValInt = CURL_SEEKFUNC_OK;
        }

        return retValInt;
    }

    size_t Easy::OnData( char *data, size_t size, size_t nmemb )
    {
        Nan::HandleScope scope;

        size_t n = size * nmemb;

        CallbacksMap::iterator it = this->callbacks.find( CURLOPT_WRITEFUNCTION );
        v8::Local<v8::Value> cbOnData = this->handle()->Get( Nan::New( Easy::onDataCbSymbol ) );

        bool hasWriteCallback = ( it != this->callbacks.end() );

        // No callback is set
        if ( !hasWriteCallback && cbOnData->IsUndefined() ) {

            return n;
        }

        const int argc = 3;
        v8::Local<v8::Object> buf = Nan::CopyBuffer( data, static_cast<uint32_t>( n ) ).ToLocalChecked();
        v8::Local<v8::Uint32> sizeArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( size ) );
        v8::Local<v8::Uint32> nmembArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( nmemb ) );

        v8::Local<v8::Value> argv[argc] = { buf, sizeArg, nmembArg };
        Nan::MaybeLocal<v8::Value> retVal;

        // Callback set with WRITEFUNCTION has priority over the onData one.
        if ( hasWriteCallback ) {

            retVal = Nan::Call( *(it->second.get()), this->handle(), argc, argv );
        }
        else {

            retVal = Nan::CallAsFunction( cbOnData->ToObject(), this->handle(), argc, argv );
        }

        size_t ret = n;

        if ( retVal.IsEmpty() ) {

            ret = 0;
        }
        else {

            ret = retVal.ToLocalChecked()->Uint32Value();
        }

        return ret;
    }


    size_t Easy::OnHeader( char *data, size_t size, size_t nmemb )
    {
        Nan::HandleScope scope;

        size_t n = size * nmemb;

        CallbacksMap::iterator it = this->callbacks.find( CURLOPT_HEADERFUNCTION );
        v8::Local<v8::Value> cbOnHeader = this->handle()->Get( Nan::New( Easy::onHeaderCbSymbol ) );

        bool hasHeaderCallback = ( it != this->callbacks.end() );

        // No callback is set
        if ( !hasHeaderCallback && cbOnHeader->IsUndefined() ) {

            return n;
        }

        const int argc = 3;
        v8::Local<v8::Object> buf = Nan::CopyBuffer( data, static_cast<uint32_t>( n ) ).ToLocalChecked();
        v8::Local<v8::Uint32> sizeArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( size ) );
        v8::Local<v8::Uint32> nmembArg = Nan::New<v8::Uint32>( static_cast<uint32_t>( nmemb ) );

        v8::Local<v8::Value> argv[argc] = { buf, sizeArg, nmembArg };
        Nan::MaybeLocal<v8::Value> retVal;

        // Callback set with HEADERFUNCTION has priority over the onHeader one.
        if ( hasHeaderCallback ) {

            retVal = Nan::Call( *(it->second.get()), this->handle(), argc, argv );
        }
        else {

            retVal = Nan::CallAsFunction( cbOnHeader->ToObject(), this->handle(), argc, argv );
        }

        size_t ret = n;

        if ( retVal.IsEmpty() ) {

            ret = 0;
        }
        else {

            ret = retVal.ToLocalChecked()->Uint32Value();
        }

        return ret;
    }

    v8::Local<v8::Value> NullValueIfInvalidString( char *str )
    {
        Nan::EscapableHandleScope scope;

        v8::Local<v8::Value> ret = Nan::Null();

        if ( str != NULL && str[0] != '\0' ) {
            ret = Nan::New( str ).ToLocalChecked();
        }

        return scope.Escape( ret );
    }

    v8::Local<v8::Object> Easy::CreateV8ObjectFromCurlFileInfo( curl_fileinfo *fileInfo )
    {
        Nan::EscapableHandleScope scope;

        v8::Local<v8::String> fileName = Nan::New( fileInfo->filename ).ToLocalChecked();
        v8::Local<v8::Integer> fileType = Nan::New( fileInfo->filetype );
        v8::Local<v8::Date>    time = Nan::New<v8::Date>( static_cast<double>( fileInfo->time ) * 1000 ).ToLocalChecked();
        v8::Local<v8::Uint32> perm = Nan::New( fileInfo->perm );
        v8::Local<v8::Integer> uid = Nan::New( fileInfo->uid );
        v8::Local<v8::Integer> gid = Nan::New( fileInfo->gid );
        v8::Local<v8::Number>  size = Nan::New<v8::Number>( static_cast<double>( fileInfo->size ) );
        v8::Local<v8::Integer> hardLinks = Nan::New( static_cast<int32_t>( fileInfo->hardlinks ) );

        v8::Local<v8::Object> strings = Nan::New<v8::Object>();
        Nan::Set( strings, Nan::New( "time" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.time ) );
        Nan::Set( strings, Nan::New( "perm" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.perm ) );
        Nan::Set( strings, Nan::New( "user" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.user ) );
        Nan::Set( strings, Nan::New( "group" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.group ) );
        Nan::Set( strings, Nan::New( "target" ).ToLocalChecked(), NullValueIfInvalidString( fileInfo->strings.target ) );

        v8::Local<v8::Object> obj = Nan::New<v8::Object>();
        Nan::Set( obj, Nan::New( "fileName" ).ToLocalChecked(), fileName );
        Nan::Set( obj, Nan::New( "fileType" ).ToLocalChecked(), fileType );
        Nan::Set( obj, Nan::New( "time" ).ToLocalChecked(), time );
        Nan::Set( obj, Nan::New( "perm" ).ToLocalChecked(), perm );
        Nan::Set( obj, Nan::New( "uid" ).ToLocalChecked(), uid );
        Nan::Set( obj, Nan::New( "gid" ).ToLocalChecked(), gid );
        Nan::Set( obj, Nan::New( "size" ).ToLocalChecked(), size );
        Nan::Set( obj, Nan::New( "hardLinks" ).ToLocalChecked(), hardLinks );
        Nan::Set( obj, Nan::New( "strings" ).ToLocalChecked(), strings );

        return scope.Escape( obj );
    }

    long Easy::CbChunkBgn( curl_fileinfo *transferInfo, void *ptr, int remains )
    {
        Easy *obj = static_cast<Easy *>( ptr );

        assert( obj );

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_CHUNK_BGN_FUNCTION );
        assert( it != obj->callbacks.end() && "CHUNK_BGN callback not set." );

        const int argc = 2;
        v8::Local<v8::Value> argv[argc] = {
            Easy::CreateV8ObjectFromCurlFileInfo( transferInfo ),
            Nan::New<v8::Number>( remains )
        };

        int32_t returnValue = CURL_CHUNK_BGN_FUNC_FAIL;

        Nan::TryCatch tryCatch;
        Nan::MaybeLocal<v8::Value> returnValueCallback = Nan::Call( *(it->second.get()), obj->handle(), argc, argv );

        if ( tryCatch.HasCaught() ) {
            tryCatch.ReThrow();
            return returnValue;
        }

        if ( returnValueCallback.IsEmpty() || !returnValueCallback.ToLocalChecked()->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the CHUNK_BGN callback must be an integer." );
            tryCatch.ReThrow();
        }
        else {

            returnValue = returnValueCallback.ToLocalChecked()->Int32Value();
        }

        return returnValue;
    }

    long Easy::CbChunkEnd( void *ptr )
    {
        Easy *obj = static_cast<Easy *>( ptr );

        assert( obj );

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_CHUNK_END_FUNCTION );
        assert( it != obj->callbacks.end() && "CHUNK_END callback not set." );

        int32_t returnValue = CURL_CHUNK_END_FUNC_FAIL;

        Nan::TryCatch tryCatch;
        Nan::MaybeLocal<v8::Value> returnValueCallback = Nan::Call( *(it->second.get()), obj->handle(), 0, NULL );

        if ( tryCatch.HasCaught() ) {
            tryCatch.ReThrow();
            return returnValue;
        }

        if ( returnValueCallback.IsEmpty() || !returnValueCallback.ToLocalChecked()->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the CHUNK_END callback must be an integer." );
            tryCatch.ReThrow();
        }
        else {

            returnValue = returnValueCallback.ToLocalChecked()->Int32Value();
        }

        return returnValue;
    }

    int Easy::CbDebug( CURL *handle, curl_infotype type, char *data, size_t size, void *userptr )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( userptr );

        assert( obj );

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_DEBUGFUNCTION );
        assert( it != obj->callbacks.end() && "DEBUG callback not set." );

        const int argc = 2;
        v8::Local<v8::Value> argv[] = {
            Nan::New<v8::Integer>( type ),
            Nan::New<v8::String>( data, static_cast<int>( size ) ).ToLocalChecked()
        };

        int32_t returnValue = 1;

        Nan::TryCatch tryCatch;
        Nan::MaybeLocal<v8::Value> returnValueCallback = Nan::Call( *(it->second.get()), obj->handle(), argc, argv );

        if ( tryCatch.HasCaught() ) {
            tryCatch.ReThrow();
            return returnValue;
        }

        if ( returnValueCallback.IsEmpty() || !returnValueCallback.ToLocalChecked()->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the DEBUG callback must be an integer." );
            tryCatch.ReThrow();
        }
        else {

            returnValue = returnValueCallback.ToLocalChecked()->Int32Value();
        }

        return returnValue;
    }

    int Easy::CbFnMatch( void *ptr, const char *pattern, const char *string )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( ptr );

        assert( obj );

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_FNMATCH_FUNCTION );
        assert( it != obj->callbacks.end() && "FNMATCH callback not set." );

        const int argc = 2;
        v8::Local<v8::Value> argv[argc] = {
            Nan::New( pattern ).ToLocalChecked(),
            Nan::New( string ).ToLocalChecked()
        };

        int32_t returnValue = CURL_FNMATCHFUNC_FAIL;

        Nan::TryCatch tryCatch;
        Nan::MaybeLocal<v8::Value> returnValueCallback = Nan::Call( *(it->second.get()), obj->handle(), argc, argv );

        if ( tryCatch.HasCaught() ) {
            tryCatch.ReThrow();
            return returnValue;
        }

        if ( returnValueCallback.IsEmpty() || !returnValueCallback.ToLocalChecked()->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the FNMATCH callback must be an integer." );
            tryCatch.ReThrow();
        }
        else {

            returnValue = returnValueCallback.ToLocalChecked()->Int32Value();
        }

        return returnValue;
    }

    int Easy::CbProgress( void *clientp, double dltotal, double dlnow, double ultotal, double ulnow )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( clientp );

        assert( obj );

        int32_t returnValue = 1;

        // See the thread here for explanation on why this flag is needed
        //  https://curl.haxx.se/mail/lib-2014-06/0062.html
        // This was fixed here
        //  https://github.com/curl/curl/commit/907520c4b93616bddea15757bbf0bfb45cde8101
        if ( obj->isCbProgressAlreadyAborted ) {
            return returnValue;
        }

        CallbacksMap::iterator it = obj->callbacks.find( CURLOPT_PROGRESSFUNCTION );
        assert( it != obj->callbacks.end() && "PROGRESS callback not set." );

        const int argc = 4;
        v8::Local<v8::Value> argv[] = {
            Nan::New<v8::Number>( static_cast<double>( dltotal ) ),
            Nan::New<v8::Number>( static_cast<double>( dlnow ) ),
            Nan::New<v8::Number>( static_cast<double>( ultotal ) ),
            Nan::New<v8::Number>( static_cast<double>( ulnow ) )
        };

        Nan::TryCatch tryCatch;
        Nan::MaybeLocal<v8::Value> returnValueCallback = Nan::Call( *(it->second.get()), obj->handle(), argc, argv );

        if ( tryCatch.HasCaught() ) {
            tryCatch.ReThrow();
            return returnValue;
        }

        if ( returnValueCallback.IsEmpty() || !returnValueCallback.ToLocalChecked()->IsInt32() ) {

            Nan::ThrowTypeError( "Return value from the PROGRESS callback must be an integer." );
            tryCatch.ReThrow();
        }
        else {

            returnValue = returnValueCallback.ToLocalChecked()->Int32Value();
        }

        if ( returnValue ) {
            obj->isCbProgressAlreadyAborted = true;
        }

        return returnValue;
    }

    int Easy::CbXferinfo( void *clientp, curl_off_t dltotal, curl_off_t dlnow, curl_off_t ultotal, curl_off_t ulnow )
    {
        Nan::HandleScope scope;

        Easy *obj = static_cast<Easy *>( clientp );

        assert( obj );

        int32_t returnValue = 1;

        // same check than above, see it for comments.
        if ( obj->isCbProgressAlreadyAborted ) {
            return returnValue;
        }

        CallbacksMap::iterator it;

        // make sure the callback was set
#if NODE_LIBCURL_VER_GE( 7, 32, 0 )
        it = obj->callbacks.find( CURLOPT_XFERINFOFUNCTION );
#else
        it = obj->callbacks.end(); // just to make it compile ¯\_(ツ)_/¯
#endif
        assert( it != obj->callbacks.end() && "XFERINFO callback not set." );

        const int argc = 4;
        v8::Local<v8::Value> argv[] = {
            Nan::New<v8::Number>( static_cast<double>( dltotal ) ),
            Nan::New<v8::Number>( static_cast<double>( dlnow ) ),
            Nan::New<v8::Number>( static_cast<double>( ultotal ) ),
            Nan::New<v8::Number>( static_cast<double>( ulnow ) )
        };

        Nan::TryCatch tryCatch;
        Nan::MaybeLocal<v8::Value> returnValueCallback = Nan::Call( *(it->second.get()), obj->handle(), argc, argv );

        if ( tryCatch.HasCaught() ) {
            tryCatch.ReThrow();
            return returnValue;
        }

        if ( returnValueCallback.IsEmpty() || !returnValueCallback.ToLocalChecked()->IsInt32() ) {
            Nan::ThrowTypeError( "Return value from the XFERINFO callback must be an integer." );
            tryCatch.ReThrow();
        }
        else {

            returnValue = returnValueCallback.ToLocalChecked()->Int32Value();
        }

        if ( returnValue ) {
            obj->isCbProgressAlreadyAborted = true;
        }

        return returnValue;
    }

    NODE_LIBCURL_MODULE_INIT( Easy::Initialize )
    {
        Nan::HandleScope scope;

        // Easy js "class" function template initialization
        v8::Local<v8::FunctionTemplate> tmpl = Nan::New<v8::FunctionTemplate>( Easy::New );
        tmpl->SetClassName( Nan::New( "Easy" ).ToLocalChecked() );
        tmpl->InstanceTemplate()->SetInternalFieldCount( 1 );
        v8::Local<v8::ObjectTemplate> proto = tmpl->PrototypeTemplate();

        // prototype methods
        Nan::SetPrototypeMethod( tmpl, "setOpt",                Easy::SetOpt );
        Nan::SetPrototypeMethod( tmpl, "getInfo",               Easy::GetInfo );
        Nan::SetPrototypeMethod( tmpl, "send",                  Easy::Send );
        Nan::SetPrototypeMethod( tmpl, "recv",                  Easy::Recv );
        Nan::SetPrototypeMethod( tmpl, "perform",               Easy::Perform );
        Nan::SetPrototypeMethod( tmpl, "pause",                 Easy::Pause );
        Nan::SetPrototypeMethod( tmpl, "reset",                 Easy::Reset );
        Nan::SetPrototypeMethod( tmpl, "dupHandle",             Easy::DupHandle );
        Nan::SetPrototypeMethod( tmpl, "onSocketEvent",         Easy::OnSocketEvent );
        Nan::SetPrototypeMethod( tmpl, "monitorSocketEvents",   Easy::MonitorSocketEvents );
        Nan::SetPrototypeMethod( tmpl, "unmonitorSocketEvents", Easy::UnmonitorSocketEvents );
        Nan::SetPrototypeMethod( tmpl, "close",                 Easy::Close );

        // static methods
        Nan::SetMethod( tmpl, "strError", Easy::StrError );

        Nan::SetAccessor( proto, Nan::New( "id" ).ToLocalChecked(), Easy::IdGetter, 0, v8::Local<v8::Value>(), v8::DEFAULT, v8::ReadOnly );
        Nan::SetAccessor( proto, Nan::New( "isInsideMultiHandle" ).ToLocalChecked(), Easy::IsInsideMultiHandleGetter, 0, v8::Local<v8::Value>(), v8::DEFAULT, v8::ReadOnly );

        Easy::constructor.Reset( tmpl );

        Easy::onDataCbSymbol.Reset(   Nan::New( "onData" ).ToLocalChecked() );
        Easy::onHeaderCbSymbol.Reset( Nan::New( "onHeader" ).ToLocalChecked() );

        Nan::Set( exports, Nan::New( "Easy" ).ToLocalChecked(), tmpl->GetFunction() );
    }

    NAN_METHOD( Easy::New )
    {
        if ( !info.IsConstructCall() ) {
            Nan::ThrowError( "You must use \"new\" to instantiate this object." );
        }

        v8::Local<v8::Value> jsHandle = info[0];
        Easy *obj = nullptr;

        // Copy constructor, used when duplicating handles.
        if ( !jsHandle->IsUndefined() ) {

            if ( !jsHandle->IsObject() || !Nan::New( Easy::constructor )->HasInstance( jsHandle ) ) {

                Nan::ThrowError( Nan::TypeError( "Argument must be an instance of an Easy handle." ) );
                return;
            }

            Easy *orig = Nan::ObjectWrap::Unwrap<Easy>( info[0]->ToObject() );

            obj = new Easy( orig );

        } else {

            obj = new Easy();
        }

        if ( obj ) {

            obj->Wrap( info.This() );
            info.GetReturnValue().Set( info.This() );
        }
    }

    NAN_GETTER( Easy::IdGetter )
    {
        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        info.GetReturnValue().Set( Nan::New( obj->id ) );
    }

    NAN_GETTER( Easy::IsInsideMultiHandleGetter )
    {
        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        info.GetReturnValue().Set( Nan::New( obj->isInsideMultiHandle ) );
    }

    NAN_METHOD( Easy::SetOpt )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        v8::Local<v8::Value> opt = info[0];
        v8::Local<v8::Value> value = info[1];

        CURLcode setOptRetCode = CURLE_UNKNOWN_OPTION;

        int optionId;

        if ( ( optionId = IsInsideCurlConstantStruct( curlOptionNotImplemented, opt ) ) ) {

            Nan::ThrowError( "Unsupported option, probably because it's too complex to implement using javascript or unecessary when using javascript (like the _DATA options)." );
            return;
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionSpecific, opt ) ) ) {

            switch( optionId ) {
                case CURLOPT_SHARE:
                    if ( value->IsNull() ) {

                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_SHARE, NULL );
                    }
                    else {

                        if ( !value->IsObject() || !Nan::New( Share::constructor )->HasInstance( value ) ) {
                            Nan::ThrowTypeError( "Invalid value for the SHARE option. It must be a Share instance." );
                            return;
                        }

                        Share *share = Nan::ObjectWrap::Unwrap<Share>( value.As<v8::Object>() );

                        if ( !share->isOpen ) {
                            Nan::ThrowError( "Share handle is already closed." );
                            return;
                        }

                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_SHARE, share->sh );
                    }
                    break;
            }

        } // linked list options
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionLinkedList, opt ) ) ) {

            // HTTPPOST is a special case, since it's an array of objects.
            if ( optionId == CURLOPT_HTTPPOST ) {

                std::string invalidArrayMsg = "HTTPPOST option value should be an Array of Objects.";

                if ( !value->IsArray() ) {

                    Nan::ThrowTypeError( invalidArrayMsg.c_str() );
                    return;
                }

                v8::Local<v8::Array> rows = v8::Local<v8::Array>::Cast( value );

                std::unique_ptr<CurlHttpPost> httpPost = std::make_unique<CurlHttpPost>();

                // [{ key : val }]
                for ( uint32_t i = 0, len = rows->Length(); i < len; ++i ) {

                    // not an array of objects
                    if ( !rows->Get( i )->IsObject() ) {

                        Nan::ThrowTypeError( invalidArrayMsg.c_str() );
                        return;
                    }

                    v8::Local<v8::Object> postData = v8::Local<v8::Object>::Cast( rows->Get( i ) );

                    const v8::Local<v8::Array> props = postData->GetPropertyNames();
                    const uint32_t postDataLength = props->Length();

                    bool hasFile = false;
                    bool hasContentType = false;
                    bool hasContent = false;
                    bool hasName = false;
                    bool hasNewFileName = false;

                    // loop through the properties names, making sure they are valid.
                    for ( uint32_t j = 0; j < postDataLength; ++j ) {

                        int32_t httpPostId = -1;

                        const v8::Local<v8::Value> postDataKey = props->Get( j );
                        const v8::Local<v8::Value> postDataValue = postData->Get( postDataKey );

                        // convert postDataKey to httppost id
                        Nan::Utf8String fieldName( postDataKey );
                        std::string optionName = std::string( *fieldName );
                        std::transform( optionName.begin(), optionName.end(), optionName.begin(), ::toupper );

                        for ( std::vector<CurlConstant>::const_iterator it = curlOptionHttpPost.begin(), end = curlOptionHttpPost.end(); it != end; ++it ) {

                            if ( it->name == optionName ) {
                                httpPostId = static_cast<int32_t>( it->value );
                            }
                        }

                        switch ( httpPostId ) {

                            case CurlHttpPost::FILE:
                                hasFile = true;
                                break;
                            case CurlHttpPost::TYPE:
                                hasContentType = true;
                                break;
                            case CurlHttpPost::CONTENTS:
                                hasContent = true;
                                break;
                            case CurlHttpPost::NAME:
                                hasName = true;
                                break;
                            case CurlHttpPost::FILENAME:
                                hasNewFileName = true;
                                break;
                            case -1: // property not found
                                std::string errorMsg;

                                errorMsg += std::string( "Invalid property given: \"" ) + optionName + "\". Valid properties are file, type, contents, name and filename.";
                                Nan::ThrowError( errorMsg.c_str() );
                                return;
                        }

                        // check if value is a string.
                        if ( !postDataValue->IsString() ) {

                            std::string errorMsg;

                            errorMsg += std::string( "Value for property \"" ) + optionName + "\" must be a string.";
                            Nan::ThrowTypeError( errorMsg.c_str() );
                            return;
                        }
                    }

                    if ( !hasName ) {

                        Nan::ThrowError( "Missing field \"name\"." );
                        return;
                    }

                    Nan::Utf8String fieldName( postData->Get( Nan::New<v8::String>( "name" ).ToLocalChecked() ) );
                    CURLFORMcode curlFormCode;

                    if ( hasFile ) {

                        Nan::Utf8String file( postData->Get( Nan::New<v8::String>( "file" ).ToLocalChecked() ) );

                        if ( hasContentType ) {

                            Nan::Utf8String contentType( postData->Get( Nan::New<v8::String>( "type" ).ToLocalChecked() ) );

                            if ( hasNewFileName ) {

                                Nan::Utf8String fileName( postData->Get( Nan::New<v8::String>( "filename" ).ToLocalChecked() ) );
                                curlFormCode = httpPost->AddFile( *fieldName, fieldName.length(), *file, *contentType, *fileName );
                            }
                            else {

                                curlFormCode = httpPost->AddFile( *fieldName, fieldName.length(), *file, *contentType );
                            }
                        }
                        else {

                            curlFormCode = httpPost->AddFile( *fieldName, fieldName.length(), *file );
                        }

                    }
                    else if ( hasContent ) { // if file is not set, the contents field MUST be set.

                        Nan::Utf8String fieldValue( postData->Get( Nan::New<v8::String>( "contents" ).ToLocalChecked() ) );

                        curlFormCode = httpPost->AddField( *fieldName, fieldName.length(), *fieldValue, fieldValue.length() );

                    }
                    else {

                        Nan::ThrowError( "Missing field \"contents\"." );
                        return;
                    }

                    if ( curlFormCode != CURL_FORMADD_OK ) {

                        std::string errorMsg;

                        errorMsg += std::string( "Error while adding field \"" ) + *fieldName + "\" to post data.";
                        Nan::ThrowError( errorMsg.c_str() );
                        return;
                    }
                }

                setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_HTTPPOST, httpPost->first );

                if ( setOptRetCode == CURLE_OK ) {
                    obj->toFree->post.push_back( std::move( httpPost ) );
                }

            }
            else {

                if ( value->IsNull() ) {

                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), NULL );

                }
                else {

                    if ( !value->IsArray() ) {

                        Nan::ThrowTypeError( "Option value must be an Array." );
                        return;
                    }

                    //convert value to curl linked list (curl_slist)
                    curl_slist *slist = NULL;
                    v8::Local<v8::Array> array = v8::Local<v8::Array>::Cast( value );

                    for ( uint32_t i = 0, len = array->Length(); i < len; ++i )
                    {
                        slist = curl_slist_append( slist, *Nan::Utf8String( array->Get( i ) ) );
                    }

                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), slist );

                    if ( setOptRetCode == CURLE_OK ) {

                        obj->toFree->slist.push_back( slist );
                    }
                }
            }

            //check if option is string, and the value is correct
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionString, opt ) ) ) {

            if ( !value->IsString() ) {

                Nan::ThrowTypeError( "Option value must be a string." );
                return;
            }

            // Create a string copy
            bool isNull = value->IsNull();

            if ( isNull ) {

                setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), NULL );
            }

            Nan::Utf8String value( info[1] );

            size_t length = static_cast<size_t>( value.length() );

            std::string valueStr = std::string( *value, length );

            //libcurl makes a copy of the strings after version 7.17, CURLOPT_POSTFIELD is the only exception
            if ( static_cast<CURLoption>( optionId ) == CURLOPT_POSTFIELDS ) {

                std::vector<char> valueChar = std::vector<char>( valueStr.begin(), valueStr.end() );
                valueChar.push_back( 0 );

                setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), &valueChar[0] );

                if ( setOptRetCode == CURLE_OK ) {
                    obj->toFree->str.push_back( std::move( valueChar ) );
                }

            }
            else {
                setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), valueStr.c_str() );
            }

            //check if option is an integer, and the value is correct
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionInteger, opt ) ) ) {

            switch ( optionId ) {
                case CURLOPT_INFILESIZE_LARGE:
                case CURLOPT_MAXFILESIZE_LARGE:
                case CURLOPT_MAX_RECV_SPEED_LARGE:
                case CURLOPT_MAX_SEND_SPEED_LARGE:
                case CURLOPT_POSTFIELDSIZE_LARGE:
                case CURLOPT_RESUME_FROM_LARGE:
                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), static_cast<curl_off_t>( value->NumberValue() ) );
                    break;
                //special case with READDATA, since we need to store the file descriptor and not overwrite the READDATA already set in the handle.
                case CURLOPT_READDATA:
                    obj->readDataFileDescriptor = value->Int32Value();
                    setOptRetCode = CURLE_OK;
                    break;
                default:
                    setOptRetCode = curl_easy_setopt( obj->ch, static_cast<CURLoption>( optionId ), static_cast<long>( value->Int32Value() ) );
                    break;
            }

            //check if option is a function, and the value is correct
        }
        else if ( ( optionId = IsInsideCurlConstantStruct( curlOptionFunction, opt ) ) ) {

            bool isNull = value->IsNull();

            if ( !value->IsFunction() && !isNull ) {

                Nan::ThrowTypeError( "Option value must be a null or a function." );
                return;
            }

            v8::Local<v8::Function> callback = value.As<v8::Function>();

            switch ( optionId ) {

                case CURLOPT_CHUNK_BGN_FUNCTION:

                    if ( isNull ) {

                        // only unset the CHUNK_DATA if CURLOPT_CHUNK_END_FUNCTION is not set.
                        if ( !obj->callbacks.count( CURLOPT_CHUNK_END_FUNCTION ) ) {
                            curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, NULL );
                        }

                        obj->callbacks.erase( CURLOPT_CHUNK_BGN_FUNCTION );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_BGN_FUNCTION, NULL );
                    }
                    else {

                        obj->callbacks[CURLOPT_CHUNK_BGN_FUNCTION].reset( new Nan::Callback( callback ) );

                        curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_BGN_FUNCTION, Easy::CbChunkBgn );
                    }

                    break;

                case CURLOPT_CHUNK_END_FUNCTION:

                    if ( isNull ) {

                        // only unset the CHUNK_DATA if CURLOPT_CHUNK_BGN_FUNCTION is not set.
                        if ( !obj->callbacks.count( CURLOPT_CHUNK_BGN_FUNCTION ) ) {
                            curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, NULL );
                        }

                        obj->callbacks.erase( CURLOPT_CHUNK_END_FUNCTION );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_END_FUNCTION, NULL );
                    }
                    else {

                        obj->callbacks[CURLOPT_CHUNK_END_FUNCTION].reset( new Nan::Callback( callback ) );

                        curl_easy_setopt( obj->ch, CURLOPT_CHUNK_DATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_CHUNK_END_FUNCTION, Easy::CbChunkEnd );
                    }

                    break;

                case CURLOPT_DEBUGFUNCTION:

                    if ( isNull ) {

                        obj->callbacks.erase( CURLOPT_DEBUGFUNCTION );
                        curl_easy_setopt( obj->ch, CURLOPT_DEBUGDATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_DEBUGFUNCTION, NULL );
                    }
                    else {

                        obj->callbacks[CURLOPT_DEBUGFUNCTION].reset( new Nan::Callback( callback ) );

                        curl_easy_setopt( obj->ch, CURLOPT_DEBUGDATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_DEBUGFUNCTION, Easy::CbDebug );
                    }

                    break;

                case CURLOPT_FNMATCH_FUNCTION:

                    if ( isNull ) {

                        obj->callbacks.erase( CURLOPT_FNMATCH_FUNCTION );
                        curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_DATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_FUNCTION, NULL );
                    }
                    else {

                        obj->callbacks[CURLOPT_FNMATCH_FUNCTION].reset( new Nan::Callback( callback ) );

                        curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_DATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_FNMATCH_FUNCTION, Easy::CbFnMatch );
                    }
                    break;

                case CURLOPT_HEADERFUNCTION:

                    setOptRetCode = CURLE_OK;

                    obj->callbacks.erase( CURLOPT_HEADERFUNCTION );

                    if ( !isNull ) {

                        obj->callbacks[CURLOPT_HEADERFUNCTION].reset( new Nan::Callback( callback ) );
                    }

                    break;

                case CURLOPT_PROGRESSFUNCTION:

                    if ( isNull ) {

                        obj->callbacks.erase( CURLOPT_PROGRESSFUNCTION );
                        curl_easy_setopt( obj->ch, CURLOPT_PROGRESSDATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_PROGRESSFUNCTION, NULL );
                    }
                    else {

                        obj->callbacks[CURLOPT_PROGRESSFUNCTION].reset( new Nan::Callback( callback ) );

                        curl_easy_setopt( obj->ch, CURLOPT_PROGRESSDATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_PROGRESSFUNCTION, Easy::CbProgress );
                    }

                    break;

                case CURLOPT_READFUNCTION:

                    setOptRetCode = CURLE_OK;

                    obj->callbacks.erase( CURLOPT_READFUNCTION );

                    if ( !isNull ) {

                        obj->callbacks[CURLOPT_READFUNCTION].reset( new Nan::Callback( callback ) );
                    }

                    break;

                case CURLOPT_SEEKFUNCTION:

                    setOptRetCode = CURLE_OK;

                    obj->callbacks.erase( CURLOPT_SEEKFUNCTION );

                    if ( !isNull ) {

                        obj->callbacks[CURLOPT_SEEKFUNCTION].reset( new Nan::Callback( callback ) );
                    }

                    break;

#if NODE_LIBCURL_VER_GE( 7, 32, 0 )
                /* xferinfo was introduced in 7.32.0.
                   New libcurls will prefer the new callback and instead use that one even if both callbacks are set. */
                case CURLOPT_XFERINFOFUNCTION:

                    if ( isNull ) {

                        obj->callbacks.erase( CURLOPT_XFERINFOFUNCTION );
                        curl_easy_setopt( obj->ch, CURLOPT_XFERINFODATA, NULL );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_XFERINFOFUNCTION, NULL );
                    }
                    else {

                        obj->callbacks[CURLOPT_XFERINFOFUNCTION].reset( new Nan::Callback( callback ) );

                        curl_easy_setopt( obj->ch, CURLOPT_XFERINFODATA, obj );
                        setOptRetCode = curl_easy_setopt( obj->ch, CURLOPT_XFERINFOFUNCTION, Easy::CbXferinfo );
                    }

                    break;
#endif

                case CURLOPT_WRITEFUNCTION:

                    setOptRetCode = CURLE_OK;

                    obj->callbacks.erase( CURLOPT_WRITEFUNCTION );

                    if ( !isNull ) {

                        obj->callbacks[CURLOPT_WRITEFUNCTION].reset( new Nan::Callback( callback ) );
                    }

                    break;
            }

        }

        info.GetReturnValue().Set( setOptRetCode );
    }

    // traits class to determine if we need to check for null pointer first
    template <typename> struct ResultTypeIsChar: std::false_type {};
    template <> struct ResultTypeIsChar<char*>: std::true_type {};

    template<typename TResultType, typename Tv8MappingType>
    v8::Local<v8::Value> Easy::GetInfoTmpl( const Easy *obj, int infoId )
    {
        Nan::EscapableHandleScope scope;

        TResultType result;

        CURLINFO info = static_cast<CURLINFO>( infoId );
        CURLcode code = curl_easy_getinfo( obj->ch, info, &result );

        v8::Local<v8::Value> retVal = Nan::Undefined();

        if ( code != CURLE_OK ) {

            std::string str = std::to_string( static_cast<int>( code ) );

            Nan::ThrowError( str.c_str() );
        }
        else {

            //is string
            if ( ResultTypeIsChar<TResultType>::value && !result ) {

                retVal = Nan::MakeMaybe( Nan::EmptyString() ).ToLocalChecked();
            }
            else {

                retVal = Nan::MakeMaybe( Nan::New<Tv8MappingType>( result ) ).ToLocalChecked();
            }

        }

        return scope.Escape( retVal );
    }

    NAN_METHOD( Easy::GetInfo )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        v8::Local<v8::Value> infoVal = info[0];

        v8::Local<v8::Value> retVal = Nan::Undefined();

        int infoId;

        CURLINFO curlInfo;
        CURLcode code = CURLE_OK;

        // Special case for unsupported info
        if ( ( infoId = IsInsideCurlConstantStruct( curlInfoNotImplemented, infoVal ) ) ) {

            Nan::ThrowError( "Unsupported info, probably because it's too complex to implement using javascript or unecessary when using javascript." );
            return;
        }

        Nan::TryCatch tryCatch;

        //String
        if ( ( infoId = IsInsideCurlConstantStruct( curlInfoString, infoVal ) ) ) {

            retVal = Easy::GetInfoTmpl<char*, v8::String>( obj, infoId );

        //Double
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoDouble, infoVal ) ) ) {

            retVal = Easy::GetInfoTmpl<double, v8::Number>( obj, infoId );

        //Integer
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoInteger, infoVal ) ) ) {

            retVal = Easy::GetInfoTmpl<long, v8::Number>( obj, infoId );

        //ACTIVESOCKET and alike
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoSocket, infoVal ) ) ) {

            curl_socket_t sock;
            code = curl_easy_getinfo( obj->ch, static_cast<CURLINFO>( infoId ), &sock );

            if ( code == CURLE_OK ) {

                // curl_socket_t is of type SOCKET on Windows,
                //  casting it to int32_t can be dangerous, only if Microsoft ever decides
                //  to change the underlying architecture behind it.
                retVal = Nan::New<v8::Integer>( static_cast<int32_t>( sock ) );
            }

        //Linked list
        }
        else if ( ( infoId = IsInsideCurlConstantStruct( curlInfoLinkedList, infoVal ) ) ) {

            curl_slist *linkedList;
            curl_slist *curr;

            curlInfo = static_cast<CURLINFO>( infoId );
            code = curl_easy_getinfo( obj->ch, curlInfo, &linkedList );

            if ( code == CURLE_OK ) {

                v8::Local<v8::Array> arr = Nan::New<v8::Array>();

                if ( linkedList ) {

                    curr = linkedList;

                    while ( curr ) {

                        arr->Set( arr->Length(), Nan::New<v8::String>( curr->data ).ToLocalChecked() );
                        curr = curr->next;
                    }

                    curl_slist_free_all( linkedList );
                }

                retVal = arr;
            }
        }

        if ( tryCatch.HasCaught() ) {

            Nan::Utf8String msg( tryCatch.Message()->Get() );

            std::string errCode = std::string( *msg );
            // based on this interesting answer https://stackoverflow.com/a/27538478/710693
            errCode.erase( std::remove_if( errCode.begin(), errCode.end(), [](unsigned char c) { return !std::isdigit(c); } ), errCode.end() );

            // 43 is CURLE_BAD_FUNCTION_ARGUMENT
            code = static_cast<CURLcode>( std::stoi( errCode.length() > 0 ? errCode : "43" ) );
        }

        v8::Local<v8::Object> ret = Nan::New<v8::Object>();
        Nan::Set( ret, Nan::New( "code" ).ToLocalChecked(), Nan::New( static_cast<int32_t>( code ) ) );
        Nan::Set( ret, Nan::New( "data" ).ToLocalChecked(), retVal );

        info.GetReturnValue().Set( ret );
    }

    NAN_METHOD( Easy::Send )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        if ( info.Length() == 0 ) {

            Nan::ThrowError( "Missing buffer argument." );
            return;
        }

        v8::Local<v8::Value> buf = info[0];

        if ( !buf->IsObject() || !node::Buffer::HasInstance( buf ) ) {

            Nan::ThrowError( "Invalid Buffer instance given." );
            return;
        }

        const char * bufContent = node::Buffer::Data( buf );
        size_t       bufLength  = node::Buffer::Length( buf );

        size_t n = 0;
        CURLcode curlRet = curl_easy_send( obj->ch, bufContent, bufLength, &n );

        v8::Local<v8::Array> ret = Nan::New<v8::Array>();
        Nan::Set( ret, 0, Nan::New( static_cast<int32_t>( curlRet ) ) );
        Nan::Set( ret, 1, Nan::New( static_cast<int32_t>( n ) ) );

        info.GetReturnValue().Set( ret );
    }


    NAN_METHOD( Easy::Recv )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        if ( info.Length() == 0 ) {

            Nan::ThrowError( "Missing buffer argument." );
            return;
        }

        v8::Local<v8::Value> buf = info[0];

        if ( !buf->IsObject() || !node::Buffer::HasInstance( buf ) ) {

            Nan::ThrowError( "Invalid Buffer instance given." );
            return;
        }

        char * bufContent      = node::Buffer::Data( buf );
        size_t       bufLength = node::Buffer::Length( buf );

        size_t n = 0;
        CURLcode curlRet = curl_easy_recv( obj->ch, bufContent, bufLength, &n );

        v8::Local<v8::Array> ret = Nan::New<v8::Array>();
        Nan::Set( ret, 0, Nan::New( static_cast<int32_t>( curlRet ) ) );
        Nan::Set( ret, 1, Nan::New( static_cast<int32_t>( n ) ) );

        info.GetReturnValue().Set( ret );
    }

    // exec this handle
    NAN_METHOD( Easy::Perform )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        CURLcode code = curl_easy_perform( obj->ch );

        v8::Local<v8::Integer> ret = Nan::New<v8::Integer>( static_cast<int32_t>( code ) );

        info.GetReturnValue().Set( ret );
    }

    NAN_METHOD( Easy::Pause )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle is closed." );
            return;
        }

        if ( !info[0]->IsUint32() ) {

            Nan::ThrowTypeError( "Bitmask value must be an integer." );
            return;
        }

        uint32_t bitmask = info[0]->Uint32Value();

        CURLcode code = curl_easy_pause( obj->ch, static_cast<int>( bitmask ) );

        info.GetReturnValue().Set( static_cast<int32_t>( code ) );
    }

    NAN_METHOD( Easy::Reset )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle closed." );
            return;
        }

        curl_easy_reset( obj->ch );

        // reset the URL, https://github.com/bagder/curl/commit/ac6da721a3740500cc0764947385eb1c22116b83
        curl_easy_setopt( obj->ch, CURLOPT_URL, "" );

        obj->callbacks.clear();
        obj->ResetRequiredHandleOptions();

        obj->toFree = nullptr;
        obj->toFree = std::make_shared<Easy::ToFree>();

        obj->readDataFileDescriptor = -1;
        obj->readDataOffset = -1;

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::DupHandle )
    {
        Nan::HandleScope scope;

        // create a new js object using this one as the argument for the constructor.
        const int argc = 1;
        v8::Local<v8::Value> argv[argc] = { info.This() };
        v8::Local<v8::Function> cons = Nan::New( Easy::constructor )->GetFunction();

        v8::Local<v8::Object> newInstance = Nan::NewInstance( cons, argc, argv ).ToLocalChecked();

        info.GetReturnValue().Set( newInstance );
    }

    NAN_METHOD( Easy::OnSocketEvent )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !info.Length() ) {

            Nan::ThrowError( "You must specify the callback function." );
            return;
        }

        v8::Local<v8::Value> arg = info[0];

        if ( arg->IsNull() ) {

            obj->cbOnSocketEvent = nullptr;

            info.GetReturnValue().Set( info.This() );
            return;
        }

        if ( !arg->IsFunction() ) {

            Nan::ThrowTypeError( "Invalid callback given." );
            return;
        }

        v8::Local<v8::Function> callback = arg.As<v8::Function>();

        obj->cbOnSocketEvent.reset( new Nan::Callback( callback ) );
        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::MonitorSocketEvents )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        Nan::TryCatch tryCatch;

        obj->MonitorSockets();

        if ( tryCatch.HasCaught() ) {

            tryCatch.ReThrow();
            return;
        }

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::UnmonitorSocketEvents )
    {
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        Nan::TryCatch tryCatch;

        obj->UnmonitorSockets();

        if ( tryCatch.HasCaught() ) {

            tryCatch.ReThrow();
            return;
        }

        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Easy::Close )
    {
        //check https://github.com/php/php-src/blob/master/ext/curl/interface.c#L3196
        Nan::HandleScope scope;

        Easy *obj = Nan::ObjectWrap::Unwrap<Easy>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Curl handle already closed." );
            return;
        }

        if ( obj->isInsideMultiHandle ) {

            Nan::ThrowError( "Curl handle is inside a Multi instance, you must remove it first." );
            return;
        }

        obj->Dispose();

        return;
    }

    NAN_METHOD( Easy::StrError )
    {
        Nan::HandleScope scope;

        v8::Local<v8::Value> errCode = info[0];

        if ( !errCode->IsInt32() ) {

            Nan::ThrowTypeError( "Invalid errCode passed to Easy.strError." );
            return;
        }

        const char * errorMsg = curl_easy_strerror( static_cast<CURLcode>( errCode->Int32Value() ) );

        v8::Local<v8::String> ret = Nan::New( errorMsg ).ToLocalChecked();

        info.GetReturnValue().Set( ret );
    }

}
