var Multi = require( 'bindings' )( 'node-libcurl' ).Multi,
    //heapdump = require( 'heapdump' ),
    amount = (process.argv[2]|0) || 1e2,
    objects= [],
    iterations = 5,
    timeout = 500,
    i, len;

//heapdump.writeSnapshot();

function leak( ) {

    for ( i = 0; i < amount; i++ ) {

        new Multi();
    }
    gc();

    //objects = [];

    if ( --iterations  ) {
        //setTimeout( leak, timeout );
        leak();
    }

}

leak();
