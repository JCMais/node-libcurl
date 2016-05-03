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
 * Example showing how to send emails through SMTP/TLS using node-libcurl.
 * Based on https://curl.haxx.se/libcurl/c/smtp-tls.html
 */
var Curl = require( '../lib/Curl' ),
    path = require( 'path' );

var curl = new Curl(),
    to   = 'recipient@domain.tld',
    from = 'sender@domain.tld (Example Sender)',
    url  = 'smtp://sub.domain.tld:587', //smtp/TLS is generally bound to 587
    // this is going to be our email. Check RFC2821 and RFC2822
    rawEmail = [
        'Date: Tue, 03 May 2016 10:58:00 -0300\r\n',
        'To: ' + to + '\r\n',
        'From: ' + from + '\r\n',
        //remember the message-ID must be different for each email sent
        'Message-ID: <node-libcurl-email-test-1@sub.domain.tld>\r\n',
        'Subject: SMTP TLS example message\r\n',
        '\r\n',
        'The body of the message starts here.\r\n',
        '\r\n',
        'It could be a lot of lines, could be MIME encoded, whatever.\r\n',
        'Check RFC5322.\r\n',
        '\r\n',
        '.\r\n'
    ],
    linesRead = 0,
    certfile = path.join( __dirname, 'cacert.pem' );

curl.setOpt( Curl.option.USERNAME, 'username' );
curl.setOpt( Curl.option.PASSWORD, 'password' );

curl.setOpt( Curl.option.URL, url );

// enabling VERBOSE mode so we can get more details on what is going on.
curl.setOpt( Curl.option.VERBOSE, true );

curl.setOpt( Curl.option.USE_SSL, Curl.usessl.ALL );
curl.setOpt( Curl.option.CAINFO, certfile );
// This is not safe, but you probably will need it if you are using a self signed certificate.
//curl.setOpt( Curl.option.SSL_VERIFYPEER, false );

curl.setOpt( Curl.option.MAIL_FROM, from );
// Make sure that MAIL_RCPT is an array
curl.setOpt( Curl.option.MAIL_RCPT, [to] );

// As we are sending data, we need to set this option.
curl.setOpt( Curl.option.UPLOAD, true );

// This callback is responsible for sending the email to the server.
// Check https://curl.haxx.se/libcurl/c/CURLOPT_READFUNCTION.html for more info about it.
// buffer is node.js Buffer instance with length of size * nmemb
// You must return the number of bytes written.
curl.setOpt( Curl.option.READFUNCTION, function( buffer, size, nmemb ) {

    var data = rawEmail[linesRead],
        ret;

    if ( linesRead === rawEmail.length || size === 0 || nmemb === 0 ) {

        return 0;
    }

    ret = buffer.write( data );

    linesRead++;

    return ret;
});

curl.on( 'end', function( statusCode, body ) {

    console.log( body );
    this.close();
});

curl.on( 'error', function( err ) {

    console.log( err );
    this.close();
});

curl.perform();
