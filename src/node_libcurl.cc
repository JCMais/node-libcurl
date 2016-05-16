/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#include <node.h>
#include <nan.h>
#include "Curl.h"
#include "Easy.h"
#include "Multi.h"
#include "Share.h"

namespace NodeLibcurl {

    static void AtExitCallback( void* arg ) {

        (void)arg;

        curl_global_cleanup();
    }

    CURL_MODULE_INIT( Init ) {

        curl_global_init( CURL_GLOBAL_ALL );

        Initialize( exports, module );
        Easy::Initialize( exports, module );
        Multi::Initialize( exports, module );
        Share::Initialize( exports, module );

        node::AtExit( AtExitCallback, NULL );
    }

    NODE_MODULE( node_libcurl, Init );
}
