#ifndef CURLHTTPPOST_H
#define CURLHTTPPOST_H

#include <stdlib.h>
#include <string.h>

#include <curl/curl.h>

class CurlHttpPost
{
public:

    curl_httppost *first;
    curl_httppost *last;

    CurlHttpPost();

    ~CurlHttpPost();

    enum {
        NAME,
        FILE,
        CONTENTS,
        TYPE
    };

    void Reset();

    CURLFORMcode AddFile( char *fieldName, long fieldNameLength, char *fileName );
    CURLFORMcode AddFile( char *fieldName, long fieldNameLength, char *fileName, char *contentType );
    CURLFORMcode AddField( char *fieldName, long fieldNameLength, char *fieldValue, long fieldValueLength );
};
#endif