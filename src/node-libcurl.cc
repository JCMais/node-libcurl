#include <nan.h>
#include "Curl.h"

NAN_MODULE_INIT( Initialize ) {

    Curl::Initialize( target );
}

NODE_MODULE( node_libcurl, Initialize );
