var Curl = require( '../lib/Curl' ),
    path = require( 'path' )
    fs   = require( 'fs' );

var curl = new Curl(),
    url  = 'http://www.google.com',
    cookieJarFile = path.join( __dirname, 'cookiejar.txt' );

curl.setOpt( Curl.option.URL, url );
curl.setOpt( Curl.option.VERBOSE, true );
curl.setOpt( Curl.option.FOLLOWLOCATION, true );
curl.setOpt( Curl.option.COOKIEFILE, cookieJarFile );
curl.setOpt( Curl.option.COOKIEJAR, cookieJarFile );

if ( !fs.existsSync( cookieJarFile ) ) {
    fs.writeFileSync( cookieJarFile );
}

curl.perform();

curl.on( 'end', function() {

    this.close();

    console.info( 'Cookie file contents:' );
    console.info( fs.readFileSync( cookieJarFile ).toString( 'utf8' ) );
});

curl.on( 'error', curl.close.bind( curl ) );