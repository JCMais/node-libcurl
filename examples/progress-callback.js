/**
 * @author Jonathan Cardoso Machado
 * @license MIT
 * @copyright 2015-2016, Jonathan Cardoso Machado
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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
    complete   = '\u001b[42m \u001b[0m',
    incomplete = '\u001b[43m \u001b[0m',
    outputFile = path.resolve( __dirname, 'result.out' ),
    lastdlnow = 0,
    speedInfo = {
        timeStart   : [0, 0],
        timeSpent   : 0,
        timeLast    : [0, 0],
        counter     : 0,
        speedAverage: 0
    },
    bar;

if ( fs.existsSync( outputFile ) ) {
    fs.unlinkSync( outputFile );
}

curl.setOpt( 'URL', url );
curl.setOpt( Curl.option.NOPROGRESS, false );

//Since we are downloading a large file, disable internal storage
// used for automatic http data/headers parsing.
//Because of that, the end event will receive null for both data/header arguments.
curl.enable( Curl.feature.NO_STORAGE );

// utility function to convert process.hrtime() call result to ms.
function hrtimeToMs( hrtimeTouple ) {

    return ( hrtimeTouple[0] * 1000 + ( hrtimeTouple[1] / 1e6 ) ) | 0;
}

// The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
// versions older than that should use PROGRESSFUNCTION.
// if you don't want to mess with version numbers,
// there is the following helper method to set the progress cb.
curl.setProgressCallback( function( dltotal, dlnow/*, ultotal, ulnow*/ ) {

    if ( dltotal === 0 ) {
        return 0;
    }

    if ( !bar ) {

        bar = new ProgressBar( 'Downloading [:bar] :percent :etas - Avg :speed Kb/s', {
            complete  : complete,
            incomplete: incomplete,
            width : 20,
            total : dltotal
        });

    }

    speedInfo.timeSpent = process.hrtime( speedInfo.timeStart );

    var now = process.hrtime();

    //update no more than 1 time per second, or if it's the last call to the callback.
    if (
        ( hrtimeToMs( speedInfo.timeLast ) / 1000 | 0 ) === ( hrtimeToMs( now ) / 1000 | 0 )
        && dlnow !== dltotal
    ) {
        return 0;
    }

    speedInfo.timeLast  = now;

    //average speed
    speedInfo.speedAverage = ( dlnow / ( ( speedInfo.timeSpent[0] > 0 ) ? speedInfo.timeSpent[0] : 1 ) );

    if ( bar ) {

        bar.tick( dlnow - lastdlnow, {
            speed : ( speedInfo.speedAverage / 1000 ).toFixed( 2 )
        });

        lastdlnow = dlnow;
    }

    return 0;
});

// This is the same than the data event, however,
// keep in mind that here the return value is considered.
curl.setOpt( Curl.option.WRITEFUNCTION, function( chunk ) {

    fs.appendFileSync( outputFile, chunk );

    return chunk.length;
});

curl.on( 'end', curl.close.bind( curl ) );

curl.on( 'error', curl.close.bind( curl ) );

speedInfo.timeStart = process.hrtime();
curl.perform();
