//Taken from http://cgit.haiku-os.org/haiku/plain/src/system/libroot/posix/string/strndup.cpp
#include "strndup.h"

char* strndup( const char* string, size_t size )
{
    // While POSIX does not mention it, we handle NULL pointers gracefully
    if (string == NULL)
        return NULL;

    size_t length = strlen(string);
    if (length > size)
        length = size;

    char* copied = (char*)malloc(length + 1);
    if (copied == NULL)
        return NULL;

    memcpy(copied, string, length);
    copied[length] = '\0';

    return copied;
}
