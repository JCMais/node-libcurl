#include "string_format.h"

#include <string.h>
#include <stdarg.h>  // for va_start, etc
#include <memory>    // for std::unique_ptr

//SOOP: stack overflow oriented programming
// http://stackoverflow.com/a/8098080/710693
std::string string_format( const std::string fmt_str, ... ) {

    int n = ((int)fmt_str.size()) * 2; /* Reserve two times as much as the length of the fmt_str */

    std::unique_ptr<char[]> formatted;

    va_list ap;
    int final_n;

    while(1) {
        formatted.reset(new char[n]); /* wrap the plain char array into the unique_ptr */
        
        strcpy(&formatted[0], fmt_str.c_str());
        
        va_start(ap, fmt_str);
        final_n = vsnprintf(&formatted[0], n, fmt_str.c_str(), ap);
        va_end(ap);
        
        if (final_n >= n)
            n = final_n + 1;
        else
            break;
    }

    return std::string(formatted.get());
}

//Make string all uppercase
void stringToUpper( std::string &s )
{
    for ( unsigned int i = 0; i < s.length(); i++ )
        s[i] = toupper( s[i] );
}
