var exec = require( 'child_process' ).exec;


exec( 'curl-config --libs', function( error, stdout, stderr ) {

    if ( error != null ) {
        console.error( 'Could not run curl-config, please make sure libcurl dev package is installed.' );
        console.error( 'Output: ' + stderr );
        process.exit( 1 );
    }

    console.log( stdout );
    process.exit( 0 );
});
