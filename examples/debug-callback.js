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

/**
 * Example of how to use the DEBUGFUNCTION option
 */
var Curl = require( '../lib/Curl' );

var curl = new Curl(),
    url = process.argv[2] || 'http://www.google.com',
    infoTypes = Curl.info.debug,
    EOL = ( process.platform === 'win32' ? '\r\n' : '\n' );

var debugCallback = function( infoType, content ) {

    var text = '';

    switch ( infoType ) {

        case infoTypes.TEXT:
            text = content;
            break;
        case infoTypes.DATA_IN:
            text = '-- RECEIVING DATA: ' + EOL + content;
            break;
        case infoTypes.DATA_OUT:
            text = '-- SENDING DATA: ' + EOL + content;
            break;
        case infoTypes.HEADER_IN:
            text = '-- RECEIVING HEADER: ' + EOL + content;
            break;
        case infoTypes.HEADER_OUT:
            text = '-- SENDING HEADER: ' + EOL + content;
            break;
        case infoTypes.SSL_DATA_IN:
            text = '-- RECEIVING SSL DATA: ' + EOL + content;
            break;
        case infoTypes.SSL_DATA_OUT:
            text = '-- SENDING SSL DATA: ' + EOL + content;
            break;
    }

    console.log( text );

    return 0;
};

curl.setOpt( 'URL', url );
curl.setOpt( 'VERBOSE', true );
curl.setOpt( 'DEBUGFUNCTION', debugCallback );

curl.on( 'end',   curl.close.bind( curl ) );
curl.on( 'error', curl.close.bind( curl ) );

curl.perform();
