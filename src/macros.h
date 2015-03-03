#ifndef MACROS_H
#define MACROS_H

#if UV_VERSION_MAJOR < 1 && UV_VERSION_MINOR < 11

    #define UV_TIMER_CB(cb) \
        void cb( uv_timer_t *timer, int status )

#else

    #define UV_TIMER_CB(cb) \
        void cb( uv_timer_t *timer )

#endif

#endif