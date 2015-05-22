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
    fs   = require( 'fs' ),
    debug  = require( 'debug' )( 'node-libcurl' );

var child, i, len,
    moduleKey, modulePath,
    urlKey, url,
    moduleInfo,
    paths = [],
    execConfig = {
        cwd : path.resolve( __dirname, '..' )
    };


exec( 'git rev-parse', function( err ) {

    if ( !err ) {

        debug( 'Already a git repo. Going directly to the tokens replacement.' );
        replaceTokensOnGypFiles();
        process.exit( 0 );
    }

    parseSubmodulesConfig();

}, execConfig );

function parseSubmodulesConfig() {

    exec( 'git config -f .gitmodules --get-regexp ^submodule\..*\.path$', function ( err, stdout ) {

        if ( err ) {
            console.log( err.toString() );
            process.exit( 1 );
        }

        debug( "Parsing git submodules configuration file." );

        var submodules = stdout.split( /\r?\n|\r/g );

        submodules.splice( -1, 1 );

        for ( i = 0, len = submodules.length; i < len; i++ ) {

            moduleInfo = submodules[i].split( ' ' );
            moduleKey = moduleInfo[0];
            modulePath= moduleInfo[1];

            paths.push(  modulePath );

            urlKey = moduleKey.replace( '.path', '.url' );

            exec( 'git config -f .gitmodules --get ' + urlKey, initGitSubmodule.bind( this, modulePath ), execConfig );
        }

    }, execConfig );

}

function initGitSubmodule( depsPath, err, url ) {

    if ( err ) {
        console.log( err.toString() );
        process.exit( 1 );
    }

    debug( "Adding git submodules: " + depsPath );

    exec( 'git init -q && git submodule add ' + url.trim() + ' ' + depsPath, function ( depsPath, err ) {

        if ( err ) {
            console.log( err.toString() );
            process.exit( 1 );
        }

        paths.splice( paths.indexOf( depsPath ), 1 );

        if ( paths.length === 0 ) {

            debug( "Running deps/curl-for-windows/configure.py" );

            //everything processed, configure
            exec( 'git submodule update --init --recursive && python deps/curl-for-windows/configure.py',
                function ( err ) {

                    if ( err ) {
                        console.log( err.toString() );
                        process.exit( 1 );
                    }

                    //Grab gyp config files and replace <(library) with static_library
                    replaceTokensOnGypFiles();

                    //remove git folder
                    exec( 'rmdir .git /S /Q', function(){
                        if ( err ) {
                            console.log( err.toString() );
                            process.exit( 1 );
                        }

                        process.exit( 0 );
                    }, execConfig );

                    process.exit( 0 );

                },
                execConfig
            )
        }

    }.bind( this, depsPath ), execConfig );

}


function replaceTokensOnGypFiles() {

    debug( "Replacing tokens on configuration files." );

    var filesToCheck = [ 'libssh2.gyp', 'openssl.gyp', 'zlib.gyp', 'curl.gyp' ],
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

    debug( "Replacing tokens on file: " + file );

    fileContent = fs.readFileSync( file ).toString();

    fileContent = fileContent.replace( search, replacement );

    fs.writeFileSync( file, fileContent );
}
