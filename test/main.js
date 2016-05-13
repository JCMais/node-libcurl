/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
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
/*eslint no-unused-vars:0*/
var should = require( 'should' );

function importTest( name, path, only, skip ) {

    if ( typeof only === 'undefined' ) {
        only = false;
    }

    if ( typeof skip === 'undefined' ) {
        skip = false;
    }

    only = !!only;
    skip = !!skip;

    if ( only ) {

        describe.only( name, function () {
            require( path );
        });

    } else if ( skip ) {

        describe.skip( name, function () {
            require( path );
        });

    } else {

        describe( name, function () {
            require( path );
        });
    }
}

describe( 'Curl', function () {
    importTest( 'Connection timeout', './curl/connection-timeout' );
    importTest( 'setOpt()', './curl/setopt' );
    importTest( 'getInfo()', './curl/getinfo' );
    importTest( 'reset()', './curl/reset' );
    importTest( 'dupHandle()', './curl/duphandle' );
    importTest( 'feature()', './curl/feature' );
    importTest( 'events', './curl/events' );
    importTest( 'Post Fields', './curl/postfields' );
    importTest( 'HTTP Auth', './curl/httpauth' );
    importTest( 'HTTP Post', './curl/httppost' );
    importTest( 'Binary Data', './curl/binary-data' );
    importTest( 'Put Upload', './curl/put-upload' );
});
