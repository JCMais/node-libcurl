var Curl = require( '../lib/Curl' ),
    querystring = require( 'querystring' );

var curl = new Curl(),
    url  = 'http://posttestserver.com/post.php',
    data = { //Data to send, inputName : value
        'input-name' : 'input-val'
    };

//You need to build the query string,
// node has this helper function, but it's limited for real use cases (no support for array values for example)
data = querystring.stringify( data );

curl.setOpt( Curl.option.URL, url );
curl.setOpt( Curl.option.POSTFIELDS, data );
curl.setOpt( Curl.option.VERBOSE, true );

console.log( querystring.stringify( data ) );

curl.perform();

curl.on( 'end', function( statusCode, body ) {

    console.log( body );

    this.close();
});

curl.on( 'error', curl.close.bind( curl ) );