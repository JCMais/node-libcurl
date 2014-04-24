#ifndef CURLHTTPPOST_H
#define CURLHTTPPOST_H

#include <stdlib.h>

#include <curl/curl.h>
#ifdef _WIN32
	#include "strndup.h"
#endif

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

	    void reset();

	    void append();

	    void set( int field, char *value, long length );
};
#endif