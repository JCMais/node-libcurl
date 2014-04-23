var Curl = require( 'bindings' )( 'node-libcurl' ).Curl,
    util = require( 'util' ),
    EventEmitter = require( 'events' ).EventEmitter,
    id = 0,
    curls = {},
    processExecutions = 0;

function _mergeChunks( chunks, length ) {

    var chunk, data, pos, i, len;

    data = new Buffer( length );

    pos = 0;

    for ( i = 0, len = chunks.length; i < len; i++ ) {

        chunk = chunks[i];
        chunk.copy( data, pos );
        pos += chunk.length;
    }

    return data;
}

function _parseHeaders( headersString ) {

    var headers = headersString.split( /\r?\n|\r/g ),
        i, len, first,
        currHeaders = {},
        result = [],
        header;

    for ( first = true, i = 0, len = headers.length; i < len; i++ ) {

        //status line
        if ( first ) {

            //see, there is no need to use regex everywhere guys
            header = headers[i].split( ' ' );

            currHeaders.result = {
                'version' : header.shift(),
                'code'    : parseInt( header.shift(), 10 ),
                'reason'  : header.join( ' ' )
            };

            first = false;

            continue;
        }

        //Empty string means empty line, which means another header group
        if ( headers[i] === "" ) {

            result.push( currHeaders );
            currHeaders = {};

            first = true;

            continue;
        }


        header = headers[i].split( ': ' );
        currHeaders[header[0]] = header[1];

    }

    return result;

}

//Node utils.inherits replaces the prototype, so it cannot be used with native modules
var inherits = function( ctor, superCtor ) {

    var originalProto = ctor.prototype;
    ctor.super_ = superCtor;
    ctor.prototype = Object.create( superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });

    //put back everything that was stolen!
    for ( var k in originalProto ) {

        ctor.prototype[k] = originalProto[k];
    }
};

inherits( Curl, EventEmitter );

Curl.isInProcess = false;
Curl.prototype._chunksLength = 0;
Curl.prototype._headerChunksLength = 0;
Curl.prototype.debug = false;
Curl.prototype.raw = false;
Curl.prototype.autoClose = true;
Curl.prototype.isRunning = false;

Curl.prototype.close = function() {

    delete curls[this._id];
    return this._close();
};

Curl.prototype._onData    = function( chunk ) {

    this._chunks.push( chunk );
    this._chunksLength += chunk.length;

    this.emit( 'data', chunk );

    return chunk.length;
};
Curl.prototype._onHeader  = function( chunk ) {

    this._headerChunks.push( chunk );
    this._headerChunksLength += chunk.length;

    this.emit( 'header', chunk );

    return chunk.length;
};
Curl.prototype._onError = function( err, errCode ) {

    var self = this;

    self.isRunning = false;

    process.nextTick(function() {
        self.emit( 'error', err, errCode );
    });
};

Curl.prototype._onEnd = function() {

    var data, header,
        argBody, argHeader, status,
        self = this;

    this.isRunning = false;

    data = _mergeChunks( this._chunks, this._chunksLength );
    header = _mergeChunks( this._headerChunks, this._headerChunksLength );

    delete this._chunks;
    delete this._chunksLength;

    if ( this.raw ) {

        argBody = data;
        argHeader = header;

    } else {

        argBody = data.toString();
        argHeader = _parseHeaders( header.toString() );
    }

    status = this._getInfo( Curl.info.RESPONSE_CODE );

    process.nextTick(function() {
        self.emit( 'end', status, argBody, argHeader );
    });
};

Curl.prototype.setOpt = function ( optionNameOrId, optionValue ) {
    return this._setOpt( optionNameOrId, optionValue );
};

Curl.prototype.getInfo = function ( infoNameOrId ) {
    return this._getInfo( infoNameOrId );
};

Curl.prototype.perform = function () {

    if ( this.isRunning ) {

        throw Error( 'cURL session is busy.' );
    }

    this._id = ++id;
    curls[this._id] = this;
    this.isRunning = true;

    this._chunks = [];
    this._headerChunks = [];

    this._perform();
    Curl.process();

    return this;
};

Curl.prototype.log = function( text ) {

    if ( this.debug ) {

        console.info( ( "[cURL " + this._id + "] " ) + text );
    }
};

Curl.process = function() {

    var once;

    if ( Curl.isInProcess ) {
        return;
    }

    ( once = function() {

        var transfered, w;

        transfered = Curl._process();

        if ( transfered > 0 ) {

            Curl.isInProcess = true;

            //Control the allocated memory, it should not be more than 4096*2
            if ( transfered > Curl._v8m && processExecutions < 10 ) {

                ++processExecutions;
                process.nextTick( once );

            } else {

                processExecutions = 0;
                w = ( Curl._v8m - transfered ) * 80 / Curl._v8m >> 0;

                if ( w < 0 ) {
                    w = 0;
                }
                setTimeout( once, w );
            }

        } else {

            Curl.isInProcess = false;
        }
    })();
};

process.on( 'exit', function() {

    for ( var k in curls )
        delete curls[k];

});

module.exports = Curl;
