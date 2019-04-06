/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <node.h>
#include <nan.h>
#include <iostream>
#include "Curl.h"
#include "Easy.h"
#include "Multi.h"
#include "Share.h"

namespace NodeLibcurl {

    static void AtExitCallback( void* arg ) {

        (void)arg;

        curl_global_cleanup();
    }

    NODE_LIBCURL_MODULE_INIT( Init ) {

        Initialize( exports, module );
        Easy::Initialize( exports, module );
        Multi::Initialize( exports, module );
        Share::Initialize( exports, module );

        node::AtExit( AtExitCallback, NULL );
    }

    NODE_MODULE( node_libcurl, Init );
}
