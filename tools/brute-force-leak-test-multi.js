var Multi  = require( '../lib/Multi' ),
    amount = ( process.argv[2] | 0 ) || 1e2,
    iterations = 5,
    timeout    = 500,
    i;

function leak() {

    for ( i = 0; i < amount; i++ ) {

        new Multi();
    }

    if ( global.gc ) {
        
        gc();
    }

    if ( --iterations  ) {

        //setTimeout( leak, timeout );
        leak();
    }

}

leak();
