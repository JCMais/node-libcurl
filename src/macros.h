#ifndef NODELIBCURL_MACROS_H
#define NODELIBCURL_MACROS_H

#if UV_VERSION_MAJOR < 1 && UV_VERSION_MINOR < 11

#define UV_TIMER_CB(cb) \
        void cb( uv_timer_t *timer, int status )

#define UV_CALL_TIMER_CB(cb, timer, status) \
        cb( timer, status )

#else

#define UV_TIMER_CB(cb) \
        void cb( uv_timer_t *timer )

#define UV_CALL_TIMER_CB(cb, timer, status) \
        cb( timer )

#endif

// inspired from the LUA bindings.
#define NODE_LIBCURL_MAKE_VERSION(MAJ, MIN, PAT) ((MAJ<<16) + (MIN<<8) + PAT)
#define NODE_LIBCURL_VER_GE(MAJ, MIN, PAT) (LIBCURL_VERSION_NUM >= NODE_LIBCURL_MAKE_VERSION(MAJ, MIN, PAT))

#endif
