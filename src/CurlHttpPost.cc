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
#include "CurlHttpPost.h"

namespace NodeLibcurl {

    CurlHttpPost::CurlHttpPost() : first( nullptr ), last( nullptr )
    {}

    CurlHttpPost::~CurlHttpPost()
    {
        this->Reset();
    }

    void CurlHttpPost::Reset()
    {
        if ( this->first ) {

            curl_formfree( this->first );
            this->first = nullptr;
            this->last = nullptr;
        }
    }

    CURLFORMcode CurlHttpPost::AddFile( char *fieldName, long fieldNameLength, char *fileName )
    {
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_FILE, fileName,
            CURLFORM_END );
    }

    CURLFORMcode CurlHttpPost::AddFile( char *fieldName, long fieldNameLength, char *fileName, char *contentType )
    {
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_FILE, fileName,
            CURLFORM_CONTENTTYPE, contentType,
            CURLFORM_END );
    }

    CURLFORMcode CurlHttpPost::AddFile( char *fieldName, long fieldNameLength, char *fileName, char *contentType, char *newFileName )
    {
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_FILE, fileName,
            CURLFORM_CONTENTTYPE, contentType,
            CURLFORM_FILENAME, newFileName,
            CURLFORM_END );
    }

    CURLFORMcode CurlHttpPost::AddField( char *fieldName, long fieldNameLength, char *fieldValue, long fieldValueLength )
    {
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_COPYCONTENTS, fieldValue, CURLFORM_CONTENTSLENGTH, fieldValueLength,
            CURLFORM_END );
    }
}
