/**
 * Example that shows the use of the the progress callback.
 * The progress bar is made using the node-progress (https://github.com/visionmedia/node-progress) module.
 * You need to install the dev dependencies to make it work.
 */

var Curl = require( '../lib/Curl' ),
    path = require( 'path' ),
    fs   = require( 'fs' ),
    ProgressBar = require( 'progress' );

var curl = new Curl(),
    url = process.argv[2] || 'http://ipv4.download.thinkbroadband.com/5MB.zip',
    outputFile = path.resolve( __dirname, 'result.out' ),
    lastdlnow = 0,
    bar;

if ( fs.existsSync( outputFile ) )
    fs.unlinkSync( outputFile );

curl.setOpt( 'URL', url );
curl.setOpt( Curl.option.NOPROGRESS, false );

//Since we are downloading a large file, disable internal storage
// used for automatic http data/headers parsing.
//Because of that, the end event will receive a nothing for both data/header arguments.
curl.enable( Curl.feature.NO_STORAGE );

// The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
// versions older than that should use PROGRESSFUNCTION.
// if you don't want to mess with version numbers,
// there is the following helper method to set the progress cb.
curl.setProgressCallback(function( dltotal, dlnow, ultotal, ulnow ) {

    if ( dltotal == 0 )
        return 0;

    if ( !bar ) {

        bar = new ProgressBar('Downloading [:bar] :percent :etas', {
            complete  : '=',
            incomplete: ' ',
            width : 20,
            total : dltotal
        });

    } else {

        bar.tick( dlnow - lastdlnow );

        lastdlnow = dlnow;
    }

    return 0;
});

// This is the same than the data event, however,
// keep in mind that here the return value is considered.
curl.onData = function( chunk ) {

    fs.appendFileSync( outputFile, chunk );

    return chunk.length;
};

curl.on( 'end', curl.close.bind( curl ) );

curl.on( 'error', curl.close.bind( curl ) );

curl.perform();
