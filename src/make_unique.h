#ifndef NODELIBCURL_MAKEUNIQUE_H  // NOLINT(legal/copyright)
#define NODELIBCURL_MAKEUNIQUE_H
#if defined(_MSC_VER) && _MSC_VER < 1800

// http://stackoverflow.com/a/13883981/710693
#include <memory>  // brings in TEMPLATE macros.

#define _MAKE_UNIQUE(TEMPLATE_LIST, PADDING_LIST, LIST, COMMA, X1, X2, X3, X4) \
                                                                               \
  template <class T COMMA LIST(_CLASS_TYPE)>                                   \
  inline std::unique_ptr<T> make_unique(LIST(_TYPE_REFREF_ARG)) {              \
    return std::unique_ptr<T>(new T(LIST(_FORWARD_ARG)));                      \
  }

_VARIADIC_EXPAND_0X(_MAKE_UNIQUE, , , , )
#undef _MAKE_UNIQUE

#elif __cplusplus == 201103L

// http://isocpp.org/files/papers/N3656.txt
#include <cstddef>
#include <memory>
#include <type_traits>
#include <utility>

namespace std {
template <class T>
struct _Unique_if {
  typedef unique_ptr<T> _Single_object;
};

template <class T>
struct _Unique_if<T[]> {
  typedef unique_ptr<T[]> _Unknown_bound;
};

template <class T, size_t N>
struct _Unique_if<T[N]> {
  typedef void _Known_bound;
};

template <class T, class... Args>
typename _Unique_if<T>::_Single_object make_unique(Args&&... args) {
  return unique_ptr<T>(new T(std::forward<Args>(args)...));
}

template <class T>
typename _Unique_if<T>::_Unknown_bound make_unique(size_t n) {
  typedef typename remove_extent<T>::type U;
  return unique_ptr<T>(new U[n]());
}

template <class T, class... Args>
typename _Unique_if<T>::_Known_bound make_unique(Args&&...) = delete;
}  // namespace std

#endif
#endif
