var Curl = require( '../lib/Curl' ),
    util = require( 'util' );

var instances = 270,
    maxCalls = 100000,
    i, j;

console.log( Curl._v8m );

function doRequest() {

    var curl = new Curl();

    curl.setOpt( Curl.option.URL, 'http://localhost/index.html' );
    //curl.autoClose = true;
    //curl.setOpt( Curl.option.NOBODY, 1 );
    //curl.on( 'end', onEnd );
    curl.perform();

}

var total = 0;
function onEnd() {

    if ( total >= maxCalls ) {

        return;
    }

    if ( ++total % 100 === 0 ) {

        console.info( total );

    }

    doRequest();
}

var next = function () {

    console.info( "Curl instances:", Curl.getCount() );

    setTimeout( next, 1000 );

};
//next();
process.stdin.resume();

process.stdin.once( 'data', function () {

    process.stdin.pause();

    for ( i = 0; i < instances; i++ ) {
        doRequest();
    }
});
