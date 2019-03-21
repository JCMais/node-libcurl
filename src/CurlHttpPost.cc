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
#include <string>
using namespace std;
#ifdef _WIN32
#include <locale>
#include <codecvt>


std::wstring UTF8ToWide(const std::string& source)
{
    std::wstring_convert<std::codecvt_utf8<wchar_t>> conv;
    return conv.from_bytes(source);
}

std::string WideToUTF8(const std::wstring& source)
{
    std::wstring_convert<std::codecvt_utf8<wchar_t>> conv;
    return conv.to_bytes(source);
}


std::wstring AsciiToWide(std::string _strSrc)
{
    int unicodeLen = MultiByteToWideChar(CP_ACP, 0, _strSrc.c_str(), -1, nullptr, 0);
    wchar_t *pUnicode = (wchar_t*)malloc(sizeof(wchar_t)*unicodeLen);
    MultiByteToWideChar(CP_ACP, 0, _strSrc.c_str(), -1, pUnicode, unicodeLen);
    std::wstring ret_str = pUnicode;
    free(pUnicode);
    return ret_str;
}

std::string WideToAscii(std::wstring _strSrc)
{
    int ansiiLen = WideCharToMultiByte(CP_ACP, 0, _strSrc.c_str(), -1, nullptr, 0, nullptr, nullptr);
    char *pAssii = (char*)malloc(sizeof(char)*ansiiLen);
    WideCharToMultiByte(CP_ACP, 0, _strSrc.c_str(), -1, pAssii, ansiiLen, nullptr, nullptr);
    std::string ret_str = pAssii;
    free(pAssii);
    return ret_str;
}
std::string UTF8ToAscii(std::string _strSrc)
{
    return WideToAscii(UTF8ToWide(_strSrc));
}

std::string AsciiToUTF8(std::string _strSrc)
{
    return WideToUTF8(AsciiToWide(_strSrc));
}
#endif

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
        std::string fname = fileName;
        #ifdef _WIN32
            fname = UTF8ToAscii(fileName);
        #endif
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_FILE, fname.c_str(),
            CURLFORM_END );
    }

    CURLFORMcode CurlHttpPost::AddFile( char *fieldName, long fieldNameLength, char *fileName, char *contentType )
    {
        std::string fname = fileName;
        #ifdef _WIN32
            fname = UTF8ToAscii(fileName);
        #endif
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_FILE, fname.c_str(),
            CURLFORM_CONTENTTYPE, contentType,
            CURLFORM_END );
    }

    CURLFORMcode CurlHttpPost::AddFile( char *fieldName, long fieldNameLength, char *fileName, char *contentType, char *newFileName )
    {
        std::string fname = fileName;
        #ifdef _WIN32
            fname = UTF8ToAscii(fileName);
        #endif
        return curl_formadd( &this->first, &this->last,
            CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
            CURLFORM_FILE, fname.c_str(),
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
