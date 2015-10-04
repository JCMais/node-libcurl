var Octokat    = require( 'octokat' ),
    log        = require( 'npmlog' ),
    fs         = require( 'fs' ),
    path       = require( 'path' ),
    versionTag = process.env['NODE_LIBCURL_VERSION_TAG'] || 'v' + require( '../package.json' ).version; //current version of the package.

var args       = process.argv.splice( 2, 2 ),
    validArgs  = ['--publish', '--unpublish'];

log.heading = 'node-libcurl';

if ( args.length !== 2 ) {

    log.error( '', 'invalid number of arguments passed to module-packaging script' );
    process.exit( -1 );
}

if ( args[0] !== validArgs[0] && args[0] !== validArgs[1] ) {

    log.error( '', 'invalid argument "%s" passed to binaries-util script.', args[0] );
    process.exit( -1 );
}

var octo = new Octokat({
        token: process.env['NODE_LIBCURL_GITHUB_TOKEN']
    }),
    repo = octo.repos( 'JCMais', 'node-libcurl' ),
    commands = {
        publish  : publish,
        unpublish: unpublish
    };


commands[args[0].replace( '--', '' )]( args[1] );

function publish( pathToPackage ) {

    getReleaseByTag( versionTag ).then(
        function( release ) {

            attachPackageToRelease( pathToPackage, release );
        },
        function ( err ) {

            // Release for given tag not found! Create one release.
            if ( err.status && err.status === 404 ) {

                log.info( '', 'release "%s" not found.', tag );
                createRelease( versionTag ).then( attachPackageToRelease.bind( null, pathToPackage ), doSomethingWithError );

            } else {

                doSomethingWithError( err );
            }
        }
    )

}

function unpublish( pathToResource ) {

    getReleaseByTag( versionTag ).then(
        removePackageFromRelease.bind( null, pathToResource ),
        doSomethingWithError
    )
}

function getReleaseByTag( tagName ) {

    log.info( '', 'searching for release "%s"', tagName );

    var result = repo.releases.tags( tagName ).fetch().then( function( release ) {

        log.info( '', 'release "%s" found: %s', release.tagName, release.url );

        return release;
    });

    return result;
}

function createRelease( tagName ) {

    log.info( '', 'creating release for "%s"', tag );
    return repo.releases.create({

        tag_name : tagName,
        name : 'node-libcurl ' + tagName + ' TEST',
        draft: false

    });
}

function attachPackageToRelease( pckg, release ) {

    log.info( '', 'attaching package to release "%s"', release.tagName );

    var packagePath = path.resolve( pckg ),
        packageFileName,
        fileContent, i, len;

    if ( !fs.existsSync( packagePath ) ) {

        log.error( '', 'could not find the package in the specified path: "%s"', packagePath );
        process.exit( -1 );
    }

    fileContent = fs.readFileSync( packagePath );
    packageFileName = path.basename( packagePath );

    // check if the package already exists, if so warn and bail out.
    for ( i = 0, len = release.assets.length; i < len; i++ ) {

        if ( release.assets[i].name === packageFileName ) {

            log.warn( '', 'package "%s" already attached to release "%s"', packageFileName, release.tagName );
            process.exit( 0 );
        }
    }

    release.upload( packageFileName, 'application/x-gzip', fileContent ).then(
        function( response ) {

            log.info( '', 'package attached with success: %s', JSON.parse( response ).browser_download_url );
            process.exit( 0 );
        },
        doSomethingWithError
    );
}

function removePackageFromRelease( packageToDelete, release ) {

    var packageToDeleteName = path.basename( packageToDelete ),
        i, len, releaseAsset, found = false;

    log.info( '', 'removing package "%s" from release "%s"', packageToDelete, release.tagName );

    for ( i = 0, len = release.assets.length; i < len; i++ ) {

        releaseAsset = release.assets[i];

        if ( releaseAsset.name === packageToDeleteName ) {

            found = true;

            releaseAsset.remove().then(
                function () {

                    log.info( '', 'removed package "%s" from release "%s"', packageToDelete, release.tagName );
                    process.exit( 0 );
                },
                doSomethingWithError
            )
        }

    }

    if ( !found ) {

        log.error( '', 'package "%s" could be found in release "%s"', packageToDelete, release.tagName );
        process.exit( -1 );
    }
}

function doSomethingWithError( err ) {

    log.error( err );
    process.exit( -1 );
}
