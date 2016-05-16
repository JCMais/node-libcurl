/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2016, Jonathan Cardoso Machado
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
 * Example showing how one could connect to one ssh server using sftp
 */
var Easy = require( '../lib/Easy' ),
    Curl = require( '../lib/Curl' ),
    host = process.argv[2] || 'sftp://user:pass@host',
    ch, ret;

ch = new Easy();

ch.setOpt( Curl.option.URL, host );
ch.setOpt( Curl.option.VERBOSE, true );
ch.setOpt( Curl.option.SSH_AUTH_TYPES, Curl.ssh_auth.PASSWORD );

ch.setOpt( Curl.option.WRITEFUNCTION, function( buf, size, nmemb ) {

    console.log( buf.toString( 'utf8' ) );
    return size * nmemb;
});

ret = ch.perform();

ch.close();

console.log( ret, ret == Curl.code.CURLE_OK, Easy.strError( ret ) );
