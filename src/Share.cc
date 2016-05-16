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
#include <iostream>
#include <stdlib.h>
#include <string.h>

#include "Share.h"
#include "Curl.h"

namespace NodeLibcurl {

    Nan::Persistent<v8::FunctionTemplate> Share::constructor;

    Share::Share() : isOpen( true )
    {
        this->sh = curl_share_init();

        assert( this->sh );
    }

    Share::~Share( void )
    {
        if ( this->isOpen ) {

            this->Dispose();
        }
    }

    void Share::Dispose()
    {
        assert( this->isOpen && "This handle was already closed." );
        assert( this->sh && "The share handle ran away." );

        CURLSHcode code = curl_share_cleanup( this->sh );
        assert( code == CURLSHE_OK );

        this->isOpen = false;
    }

    CURL_MODULE_INIT( Share::Initialize )
    {
        Nan::HandleScope scope;

        // Easy js "class" function template initialization
        v8::Local<v8::FunctionTemplate> tmpl = Nan::New<v8::FunctionTemplate>( Share::New );
        tmpl->SetClassName( Nan::New( "Share" ).ToLocalChecked() );
        tmpl->InstanceTemplate()->SetInternalFieldCount( 1 );

        // prototype methods
        Nan::SetPrototypeMethod( tmpl, "setOpt", Share::SetOpt );
        Nan::SetPrototypeMethod( tmpl, "close", Share::Close );

        // static methods
        Nan::SetMethod( tmpl, "strError", Share::StrError );

        Share::constructor.Reset( tmpl );

        Nan::Set( exports, Nan::New( "Share" ).ToLocalChecked(), tmpl->GetFunction() );
    }

    NAN_METHOD( Share::New )
    {
        if ( !info.IsConstructCall() ) {
            Nan::ThrowError( "You must use \"new\" to instantiate this object." );
        }
        
        Share *obj = new Share();

        obj->Wrap( info.This() );
        info.GetReturnValue().Set( info.This() );
    }

    NAN_METHOD( Share::SetOpt )
    {

        Nan::HandleScope scope;

        Share *obj = Nan::ObjectWrap::Unwrap<Share>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Share handle is closed." );
            return;
        }

        v8::Local<v8::Value> opt = info[0];
        v8::Local<v8::Value> value = info[1];

        CURLSHcode setOptRetCode = CURLSHE_BAD_OPTION;
        int32_t optionId = -1;

        if ( !value->IsInt32() ) {

            ThrowError( "Option value must be an integer." );
            return;
        }

        if ( opt->IsInt32() ) {

            optionId = opt->Int32Value();
        }
        else if ( opt->IsString() ) {

            Nan::Utf8String option( opt );

            std::string optionString( *option );

            if ( optionString == "SHARE" ) {
                optionId = static_cast<int>( CURLSHOPT_SHARE );
            }
            else if ( optionString == "UNSHARE" ) {
                optionId = static_cast<int>( CURLSHOPT_UNSHARE );
            }
        }

        setOptRetCode = curl_share_setopt( obj->sh, static_cast<CURLSHoption>( optionId ), value->Int32Value() );

        info.GetReturnValue().Set( setOptRetCode );
    }

    NAN_METHOD( Share::Close )
    {
        Nan::HandleScope scope;

        Share *obj = Nan::ObjectWrap::Unwrap<Share>( info.This() );

        if ( !obj->isOpen ) {

            Nan::ThrowError( "Share handle already closed." );
            return;
        }

        obj->Dispose();

        return;
    }

    NAN_METHOD( Share::StrError )
    {
        Nan::HandleScope scope;

        v8::Local<v8::Value> errCode = info[0];

        if ( !errCode->IsInt32() ) {

            Nan::ThrowTypeError( "Invalid errCode passed to Share.strError." );
            return;
        }

        const char * errorMsg = curl_share_strerror( static_cast<CURLSHcode>( errCode->Int32Value() ) );

        v8::Local<v8::String> ret = Nan::New( errorMsg ).ToLocalChecked();

        info.GetReturnValue().Set( ret );
    }

}
