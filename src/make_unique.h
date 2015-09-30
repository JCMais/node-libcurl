#ifndef NODELIBCURL_MAKEUNIQUE_H
#define NODELIBCURL_MAKEUNIQUE_H
#if defined(_MSC_VER) && _MSC_VER < 1800

//http://stackoverflow.com/a/13883981/710693
#include <memory> // brings in TEMPLATE macros.

#define _MAKE_UNIQUE(TEMPLATE_LIST, PADDING_LIST, LIST, COMMA, X1, X2, X3, X4)  \
\
template<class T COMMA LIST(_CLASS_TYPE)>    \
inline std::unique_ptr<T> make_unique(LIST(_TYPE_REFREF_ARG))    \
{    \
    return std::unique_ptr<T>(new T(LIST(_FORWARD_ARG)));    \
}

_VARIADIC_EXPAND_0X( _MAKE_UNIQUE, , , , )
#undef _MAKE_UNIQUE

#elif __cplusplus == 201103L

//http://isocpp.org/files/papers/N3656.txt
#include <memory>
#include <type_traits>
#include <utility>

template <typename T, typename... Args>
std::unique_ptr<T> make_unique_helper( std::false_type, Args&&... args ) {
    return std::unique_ptr<T>( new T( std::forward<Args>( args )... ) );
}

template <typename T, typename... Args>
std::unique_ptr<T> make_unique_helper( std::true_type, Args&&... args ) {
    static_assert( std::extent<T>::value == 0,
        "make_unique<T[N]>() is forbidden, please use make_unique<T[]>()." );

    typedef typename std::remove_extent<T>::type U;
    return std::unique_ptr<T>( new U[sizeof...( Args )]{ std::forward<Args>( args )... } );
}

template <typename T, typename... Args>
std::unique_ptr<T> make_unique( Args&&... args ) {
    return make_unique_helper<T>( std::is_array<T>(), std::forward<Args>( args )... );
}

#endif
#endif
