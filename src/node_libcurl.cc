/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015, Jonathan Cardoso Machado
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

#include <node.h>
#include <nan.h>
#include <iostream>
#include "Curl.h"
#include "Easy.h"
#include "Multi.h"
#include "Share.h"

namespace NodeLibcurl {

    static void AtExitCallback( void* arg ) {

        (void)arg;

        curl_global_cleanup();
    }

    // The following memory allocation wrappers are mostly the ones at
    //  https://github.com/gagern/libxmljs/blob/master/src/libxmljs.cc#L77
    //  made by Martin von Gagern (https://github.com/gagern)
    //  Related code review at http://codereview.stackexchange.com/q/128547/10394
    struct MemWrapper {
        size_t size;
        curl_off_t data;
    };

#define MEMWRAPPER_SIZE offsetof( MemWrapper, data )

    inline void* MemWrapperToClient( MemWrapper* memWrapper ) {
        return static_cast<void*>( reinterpret_cast<char*>( memWrapper ) + MEMWRAPPER_SIZE );
    }

    inline MemWrapper* ClientToMemWrapper( void* client ) {
        return reinterpret_cast<MemWrapper*>( static_cast<char*>( client ) - MEMWRAPPER_SIZE );
    }

    void* MallocCallback( size_t size )
    {
        size_t totalSize = size + MEMWRAPPER_SIZE;
        MemWrapper* mem = static_cast<MemWrapper*>( malloc( totalSize ) );
        if ( !mem ) return NULL;
        mem->size = size;
        AdjustMemory( totalSize );
        return MemWrapperToClient( mem );
    }

    void FreeCallback( void* p )
    {
        if ( !p ) return;
        MemWrapper* mem = ClientToMemWrapper( p );
        ssize_t totalSize = mem->size + MEMWRAPPER_SIZE;
        AdjustMemory( -totalSize );
        free( mem );
    }

    void* ReallocCallback( void* ptr, size_t size )
    {
        if ( !ptr ) return MallocCallback( size );
        MemWrapper* mem1 = ClientToMemWrapper( ptr );
        ssize_t oldSize = mem1->size;
        MemWrapper* mem2 = static_cast<MemWrapper*>( realloc( mem1, size + MEMWRAPPER_SIZE ) );
        if ( !mem2 ) return NULL;
        mem2->size = size;
        AdjustMemory( ssize_t( size ) - oldSize );
        return MemWrapperToClient( mem2 );
    }

    char* StrdupCallback( const char* str )
    {
        size_t size = strlen( str ) + 1;
        char* res = static_cast<char*>( MallocCallback( size ) );
        if ( res ) memcpy( res, str, size );
        return res;
    }

    void* CallocCallback( size_t nmemb, size_t size )
    {
        void* ptr = MallocCallback( nmemb * size );
        if ( !ptr ) return NULL;
        memset( ptr, 0, nmemb * size ); // zero-fill
        return ptr;
    }

    NODE_LIBCURL_MODULE_INIT( Init ) {

        curl_version_info_data *version = curl_version_info( CURLVERSION_NOW );
        isLibcurlBuiltWithThreadedResolver = ( version->features & CURL_VERSION_ASYNCHDNS ) == CURL_VERSION_ASYNCHDNS;

        // We only add the allloc wrappers if we are running libcurl without the threaded resolver
        //  that is because v8 AdjustAmountOfExternalAllocatedMemory must be called from the Node thread
        if ( isLibcurlBuiltWithThreadedResolver ) {
            curl_global_init_mem( CURL_GLOBAL_ALL, MallocCallback, FreeCallback, ReallocCallback, StrdupCallback, CallocCallback );
        }
        else {
            curl_global_init( CURL_GLOBAL_ALL );
        }

        Initialize( exports, module );
        Easy::Initialize( exports, module );
        Multi::Initialize( exports, module );
        Share::Initialize( exports, module );

        node::AtExit( AtExitCallback, NULL );
    }

    NODE_MODULE( node_libcurl, Init );
}
