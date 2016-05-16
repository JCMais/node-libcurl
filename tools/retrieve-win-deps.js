//only run on win32
if ( process.platform !== 'win32' ) {
    process.exit( 0 );
}

/*
 * Notes about this script:
 * It's a mess because of the callback hell, I could have used a promise library here,
 * but adding a dependency that is going to be used only in a single script, that is executed
 * only on Windows machines during install is not worth it.
 */

var exec = require( 'child_process' ).exec,
    path = require( 'path' ),
    fs   = require( 'fs' );

var i, len,
    moduleKey, modulePath,
    moduleInfo,
    paths = [],
    execConfig = {
        cwd : path.resolve( __dirname, '..' )
    },
    depsGypTarget = 'deps/curl-for-windows/curl.gyp:libcurl';

//check if we are already in a git repo.
exec( 'git rev-parse', function( err ) {

    if ( !err ) {

        replaceTokensOnGypFiles();

        process.stdout.write( depsGypTarget );

    } else {

        parseSubmodulesConfig();
    }

}, execConfig );

function parseSubmodulesConfig() {

    exec( 'git config -f .gitmodules --get-regexp ^submodule\..*\.path$', function ( err, stdout ) {

        if ( err ) {

            console.error( err.toString() );
            process.exit( 1 );
        }

        var submodules = stdout.split( /\r?\n|\r/g );

        submodules.splice( -1, 1 );

        for ( i = 0, len = submodules.length; i < len; i++ ) {

            moduleInfo = submodules[i].split( ' ' );
            moduleKey = moduleInfo[0];
            modulePath= moduleInfo[1];

            paths.push(  modulePath );

            var urlKey = moduleKey.replace( '.path', '.url' );

            exec( 'git config -f .gitmodules --get ' + urlKey, initGitSubmodule.bind( this, modulePath ), execConfig );
        }

    }, execConfig );

}

function initGitSubmodule( depsPath, err, url ) {

    if ( err ) {

        console.error( err.toString() );
        process.exit( 1 );
    }

    exec( 'git init -q && git submodule add ' + url.trim() + ' ' + depsPath, function ( depsPath, err ) {

        if ( err ) {

            console.error( err.toString() );
            process.exit( 1 );
        }

        paths.splice( paths.indexOf( depsPath ), 1 );

        if ( paths.length === 0 ) {

            //everything processed, configure
            exec( 'git submodule update --init --recursive && python deps/curl-for-windows/configure.py',
                function ( err ) {

                    if ( err ) {

                        console.error( err.toString() );
                        process.exit( 1 );
                    }

                    //Grab gyp config files and replace <(library) with static_library
                    replaceTokensOnGypFiles();

                    //remove git folder
                    exec( 'rmdir .git /S /Q', function() {

                        if ( err ) {

                            console.error( err.toString() );
                            process.exit( 1 );
                        }

                        process.stdout.write( depsGypTarget );

                    }, execConfig );
                },
                execConfig
            );
        }

    }.bind( this, depsPath ), execConfig );
}


function replaceTokensOnGypFiles() {

    var filesToCheck = [ 'libssh2.gyp', 'openssl/openssl.gyp', 'zlib.gyp', 'curl.gyp' ],
        search = /<\(library\)/g,
        replacement = 'static_library',
        i, len, file;

    for ( i = 0, len = filesToCheck.length; i < len; i++ ) {

        file = path.resolve( __dirname, '..', 'deps', 'curl-for-windows', filesToCheck[i] );

        replaceOnFile( file, search, replacement );
    }
}

function replaceOnFile( file, search, replacement ) {

    var fileContent;

    if ( !fs.existsSync( file ) ) {

        console.error( 'File: ', file, ' not found.' );
        process.exit( 1 );
    }

    fileContent = fs.readFileSync( file ).toString();

    fileContent = fileContent.replace( search, replacement );

    fs.writeFileSync( file, fileContent );
}
