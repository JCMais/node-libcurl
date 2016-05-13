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
 * Example showing how to upload a file to a ftp server using node-libcurl
 * Mostly based on https://curl.haxx.se/libcurl/c/ftpupload.html
 * How to run:
 *  node ftp-upload.js ftp://example-of-ftp-host.com username password
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    fs   = require( 'fs' );

var curl = new Curl(),
    url  = process.argv[2].replace( /\/$/, '' ) + '/',
    username = process.argv[3],
    password = process.argv[4],
    localFile = 'test.txt',
    uploadFileWithName = 'file-uploading.txt',
    renameUploadedFileTo = 'file-uploaded.txt',
    headerList = [
        'RNFR ' + uploadFileWithName,
        'RNTO ' + renameUploadedFileTo
    ], fd, fileStat;

fd = fs.openSync( path.join( __dirname, localFile ), 'r' );

fileStat = fs.fstatSync( fd );

// enable verbose mode
curl.setOpt( Curl.option.VERBOSE, true );
// specify target, username and password
curl.setOpt( Curl.option.URL, url + uploadFileWithName );
curl.setOpt( Curl.option.USERNAME, username );
curl.setOpt( Curl.option.PASSWORD, password );
// enable uploading
curl.setOpt( Curl.option.UPLOAD, true );
// pass in that last of FTP commands to run after the transfer
curl.setOpt( Curl.option.POSTQUOTE, headerList );
// now specify which file to upload, in this case
//  we are using a file descriptor given by fs.openSync
curl.setOpt( Curl.option.READDATA, fd );
// Set the size of the file to upload (optional).
//  You must the *_LARGE option if the file is greater than 2GB.
curl.setOpt( Curl.option.INFILESIZE_LARGE, fileStat.size );

// enable raw mode
curl.enable( Curl.feature.RAW );

curl.perform();

curl.on( 'end', function() {

    curl.close();
    fs.closeSync( fd );
});

curl.on( 'error', function( err ) {

    console.log( err );

    curl.close();
    fs.closeSync( fd );
});
