var exec    = require( 'child_process' ).exec,
    resolve = require( 'path' ).resolve,
    config = {cwd : resolve( __dirname, '..' ) };

exec(
    'git submodule update --init --recursive && python deps/curl-for-windows/configure.py',
    function ( err ) {

        if ( err ) {

            console.log( err.toString() );
            process.exit( 1 );
        }

        process.exit( 0 );

    },
    config
);

