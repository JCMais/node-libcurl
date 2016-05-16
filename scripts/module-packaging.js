/*eslint camelcase: [2, {properties: "never"}]*/
var octonode   = require( 'octonode' ),
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

    log.error( '', 'invalid argument "%s" passed to module-packaging script.', args[0] );
    process.exit( -1 );
}

var octo = octonode.client( process.env['NODE_LIBCURL_GITHUB_TOKEN'] ),
    repo = octo.repo( 'JCMais/node-libcurl' ),
    commands = {
        publish  : publish,
        unpublish: unpublish
    };

commands[args[0].replace( '--', '' )]( args[1] );

function publish( pathToPackage ) {

    getReleaseByTag( versionTag, function( err, data, headers ) {

        if ( err ) {

            if ( err.statusCode && err.statusCode === 404 ) {

                createRelease( versionTag, attachPackageToRelease.bind( null, pathToPackage ) );

            } else {

                doSomethingWithError(  err );
            }

        } else {

            attachPackageToRelease( pathToPackage, null, data, headers );
        }
    });
}

function unpublish( pathToResource ) {

    getReleaseByTag( versionTag, function ( err, release/*, headers*/ ) {

        if ( err ) {
            doSomethingWithError( err );
            return;
        }

        removePackageFromRelease( pathToResource, release );

    });
}

function getReleaseByTag( tagName, cb ) {

    log.info( '', 'searching for release "%s"', tagName );

    repo.release( 'tags/' + tagName ).info( function( err, data, headers ) {

        if ( err && err.statusCode && err.statusCode === 404 ) {

            log.info( '', 'release for tag "%s" not found.', tagName );

        } else {

            log.info( '', 'release for tag "%s" found: %s', tagName, data.url );
        }

        cb( err, data, headers );
    });
}

function createRelease( tagName, cb ) {

    log.info( '', 'creating release for tag "%s"', tagName );

    repo.release({
        "tag_name" : tagName
    }, cb );
}

function attachPackageToRelease( pckg, err, release/*, headers*/ ) {

    if ( err ) {

        doSomethingWithError( err );
        return;
    }

    var packagePath = path.resolve( pckg ),
        packageFileName,
        fileContent, i, len;

    if ( !fs.existsSync( packagePath ) ) {

        log.error( '', 'could not find the package in the specified path: "%s"', packagePath );
        process.exit( -1 );
    }

    log.info( '', 'attaching package "%s" to release "%s"', packagePath, release.url );

    packageFileName = path.basename( packagePath );

    // check if the package already exists, if so warn and bail out.
    for ( i = 0, len = release.assets.length; i < len; i++ ) {

        if ( release.assets[i].name === packageFileName ) {

            log.warn( '', 'package "%s" already attached to release "%s"', packageFileName, release.tag_name );
            process.exit( 0 );
        }
    }

    fileContent = fs.readFileSync( packagePath );

    repo.release( release.id ).uploadAssets( fileContent, {
        name: packageFileName,
        contentType: 'application/x-gzip'
    }, function( err, data/*, headers*/ ) {

        if ( err ) {

            doSomethingWithError( err );
            return;
        }

        log.info( '', 'package attached with success: %s', data.browser_download_url );
        process.exit( 0 );
    });
}

function removePackageFromRelease( packageToDelete, release ) {

    var packageToDeleteName = path.basename( packageToDelete ),
        i, len, releaseAsset, found = false;

    log.info( '', 'removing package "%s" from release "%s"', packageToDelete, release.tag_name );

    for ( i = 0, len = release.assets.length; i < len; i++ ) {

        releaseAsset = release.assets[i];

        if ( releaseAsset.name === packageToDeleteName ) {

            found = true;

            //@FIXME using internals because there is no way to remove directly
            // uri to remove assets is: repos/:owner/:repo/releases/assets/:id
            repo.client.del( '/repos/' + repo.name + '/releases/assets/' + releaseAsset.id, null, function( err/*, data, headers*/ ) {

                if ( err ) {

                    doSomethingWithError( err );
                    return;
                }

                log.info( '', 'removed package "%s" from release "%s"', packageToDelete, release.tag_name );
                process.exit( 0 );
            });
        }

    }

    if ( !found ) {

        log.error( '', 'package "%s" could be found in release "%s"', packageToDelete, release.tag_name );
        process.exit( -1 );
    }
}

function doSomethingWithError( err ) {

    log.error(  '', err );
    process.exit( -1 );
}
