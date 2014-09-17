var Curl = require( '../lib/Curl' );

var curl = new Curl(),
    url  = 'http://www.google.com';

curl.setOpt( Curl.option.URL, url );
curl.setOpt( Curl.option.FOLLOWLOCATION, true );
curl.setOpt( Curl.option.COOKIEFILE, "" ); //enable cookies
curl.perform();

curl.on( 'end', function() {

    for ( var infoName in Curl.info ) {

        console.info( infoName, ': ', this.getInfo( infoName ) );
    }


    this.close();
});

curl.on( 'error', curl.close.bind( curl ) );