#include "CurlHttpPost.h"

CurlHttpPost::CurlHttpPost () : first( NULL ), last( NULL )
{

    this->reset();

}

CurlHttpPost::~CurlHttpPost ()
{
    this->reset();
}

void CurlHttpPost::reset()
{
	curl_httppost *current  = this->first;

	while ( current ) {

		curl_httppost *next = current->next;

		if ( current->contenttype )

			free( current->contenttype );

		if ( current->contents )
			free( current->contents );

		if ( current->buffer )
			free( current->buffer );

		if ( current->name )
			free( current->buffer );

		free( current );

		current = next;
	}

	this->first = NULL;
	this->last  = NULL;
}

void CurlHttpPost::append()
{
	if ( !this->first ) {

		this->first = ( curl_httppost* ) calloc( 1, sizeof( curl_httppost ) );
		this->last  = this->first;

	} else {

		this->last->next = ( curl_httppost* ) calloc( 1, sizeof( curl_httppost ) );
		this->last = this->last->next;
	}
}

void CurlHttpPost::set( int field, char *value, long length )
{
	value = strndup( value, length );

	switch ( field ) {

		case NAME:
			last->name = value;
			last->namelength = length;
			break;

		case TYPE:
			last->contenttype = value;
			break;

		case FILE:
			last->flags |= HTTPPOST_FILENAME;
		    
        case CONTENTS:
            last->contents = value;
			last->contentslength = length;
			break;

		default:
			// `default` should never be reached.
			free(value);
		    break;
	}
}