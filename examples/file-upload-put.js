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
 * Example showing how to upload a file using PUT.
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    fs   = require( 'fs' ),
    crypto = require( 'crypto' );

var curl = new Curl(),
    url = 'httpbin.org/put',
    fileSize = 10 * 1024, //1KB
    fileName = path.resolve( __dirname, 'upload.test' );

//write random bytes to a file, this will be our upload file.
fs.writeFileSync( fileName, crypto.randomBytes( fileSize ) );

console.log( 'File: ', fs.readFileSync( fileName, 'base64' ) );

fs.open( fileName, 'r+', function( err, fd ) {

    //enabling VERBOSE mode so we can get more details on what is going on.
    curl.setOpt( Curl.option.VERBOSE, 1 );
    //set UPLOAD to a truthy value to enable PUT upload.
    curl.setOpt( Curl.option.UPLOAD, 1 );
    //pass the file descriptor to the READDATA option
    // passing one invalid value here will cause an aborted by callback error.
    curl.setOpt( Curl.option.READDATA, fd );

    curl.setOpt( Curl.option.URL, url );

    curl.on( 'end', function( statusCode, body ) {

        console.log( body );

        //remember to always close the file descriptor!
        fs.closeSync( fd );

        fs.unlinkSync( fileName );

        //the same for the curl instance, always close it when you don't need it anymore.
        this.close();
    });

    curl.on( 'error', function( err ) {

        console.log( err );

        fs.closeSync( fd );
        fs.unlinkSync( fileName );
        this.close();
    });

    curl.perform();
});
