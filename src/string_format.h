#ifndef STRING_FORMAT_H
#define STRING_FORMAT_H

#include <string>
#include <stdarg.h>  // for va_start, etc
#include <memory>    // for std::unique_ptr

std::string string_format( const std::string, ... );

#endif