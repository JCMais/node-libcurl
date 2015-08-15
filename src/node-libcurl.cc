#include <nan.h>
#include "Curl.h"

NAN_MODULE_INIT( Init ) {

    Curl::Initialize( target );
}

NODE_MODULE( node_libcurl, Init );
