//only run on win32
if ( process.platform !== 'win32' ) {
    process.exit( 0 );
}

/*
 * Notes about this script:
 * It's a really mess because of the callback hell, I could have used a promise library here,
 * but adding a dependency that is going to be used only on a single script, that is executed
 * only on Windows machines during install is not worth it.
 */

var exec = require( 'child_process' ).exec,
    path = require( 'path' );

var child, i, len,
    moduleKey, modulePath,
    urlKey, url,
    moduleInfo,
    paths = [],
    execConfig = {
        //cwd : path.resolve( __dirname, '..' )
    };

exec( 'git rev-parse', function( err ) {

    if ( !err ) {

        //already a git repo, dev machine? Just ignore.
        process.exit( 0 );
    }

    parseSubmodulesConfig();

});

function parseSubmodulesConfig() {

    exec( 'git config -f .gitmodules --get-regexp ^submodule\..*\.path$', function ( err, stdout ) {

        if ( err ) {
            console.log( err.toString() );
            process.exit( 1 );
        }

        var submodules = stdout.split( /\r?\n|\r/g );

        submodules.splice( -1, 1 );

        for ( i = 0, len = submodules.length; i < len; i++ ) {

            moduleInfo = submodules[i].split( ' ' );
            moduleKey = moduleInfo[0];
            modulePath= moduleInfo[1];

            paths.push( modulePath );

            urlKey = moduleKey.replace( '.path', '.url' );

            exec( 'git config -f .gitmodules --get ' + urlKey, initGitSubmodule.bind( this, modulePath ) );
        }

    }, execConfig );

}

function initGitSubmodule( path, err, url ) {

    if ( err ) {
        console.log( err.toString() );
        process.exit( 1 );
    }

    exec( 'git submodule add ' + url + ' ' + path, function ( path, err ) {

        if ( err ) {
            console.log( err.toString() );
            process.exit( 1 );
        }

        paths.splice( paths.indexOf( path ), 1 );

        if ( paths.length === 0 ) {

            //everything processed, configure
            exec(
                'git submodule update --init --recursive && python deps/curl-for-windows/configure.py',
                function ( err ) {

                    if ( err ) {
                        console.log( err.toString() );
                        process.exit( 1 );
                    }

                    process.exit( 0 );

                },
                execConfig
            )
        }

    }.bind( this, path ), execConfig );

}
