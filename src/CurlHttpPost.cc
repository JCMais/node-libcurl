#include "CurlHttpPost.h"

CurlHttpPost::CurlHttpPost () : first( nullptr ), last( nullptr )
{}

CurlHttpPost::~CurlHttpPost ()
{
    this->Reset();
}

void CurlHttpPost::Reset()
{
    if ( this->first ) {

        curl_formfree( this->first );
        this->first = nullptr;
        this->last  = nullptr;
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

CURLFORMcode CurlHttpPost::AddField( char *fieldName, long fieldNameLength, char *fieldValue, long fieldValueLength )
{
    return curl_formadd( &this->first, &this->last,
        CURLFORM_COPYNAME, fieldName, CURLFORM_NAMELENGTH, fieldNameLength,
        CURLFORM_COPYCONTENTS, fieldValue, CURLFORM_CONTENTSLENGTH, fieldValueLength,
        CURLFORM_END );
}