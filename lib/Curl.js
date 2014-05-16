/**
 * @class
 * @extends EventEmitter
 */
var Curl = require( 'bindings' )( 'node-libcurl' ).Curl;

var util = require( 'util' ),
    StringDecoder = require( 'string_decoder' ).StringDecoder,
    decoder = new StringDecoder( 'utf8' ),
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
var inherits = function( ctor, superCtor, copyStaticMembers ) {

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

    if ( copyStaticMembers ) for ( k in superCtor ) {

        if ( superCtor.hasOwnProperty( k ) )
            ctor[k] = superCtor[k];
    }
};

inherits( Curl, EventEmitter );

/**
 * Event called after the constructor,
 * so we can do some initalization here.
 * @private
 */
Curl.prototype._onCreated = function() {

    this._id = ++id;
    this._chunks = [];
    this._headerChunks = [];

    this._chunksLength = 0;
    this._headerChunksLength = 0;
    this.debug = false;
    this.raw = false;
    this._isRunning = false;

    curls[this._id] = this;

};

/**
 * Returns the chunk length
 * This value is used by the native caller and must be equals the length of the data received.
 * @param {Buffer} chunk
 * @returns {Number}
 * @private
 */
Curl.prototype._onData    = function( chunk ) {

    this._chunks.push( chunk );
    this._chunksLength += chunk.length;

    this.emit( 'data', chunk );

    return chunk.length;
};

/**
 * Same than {@link _onData} but for the headers.
 * @param chunk
 * @returns {Number}
 * @private
 */
Curl.prototype._onHeader  = function( chunk ) {

    this._headerChunks.push( chunk );
    this._headerChunksLength += chunk.length;

    this.emit( 'header', chunk );

    return chunk.length;
};

/**
 * Event called when a error is thrown on this handler.
 * @param {Error} err Exception obj
 * @param {Number} errCode Curl error code.
 * @private
 */
Curl.prototype._onError = function( err, errCode ) {

    var self = this;

    self._isRunning = false;

    self.emit( 'error', err, errCode );
};

/**
 * Called when this handler has finished the connection.
 * @private
 */
Curl.prototype._onEnd = function() {

    var data, header,
        argBody, argHeader, status,
        self = this;

    this._isRunning = false;

    data = _mergeChunks( this._chunks, this._chunksLength );
    header = _mergeChunks( this._headerChunks, this._headerChunksLength );

    this._chunks = [];
    this._headerChunks = [];
    this._chunksLength = 0;
    this._headerChunksLength = 0;

    if ( this.raw ) {

        argBody = data;
        argHeader = header;

    } else {

        argBody = decoder.write( data );
        argHeader = _parseHeaders( decoder.write( header ) );
    }

    status = this._getInfo( Curl.info.RESPONSE_CODE );

    self.emit( 'end', status, argBody, argHeader );
};

/**
 * Debug msg
 * @param {String} text
 * @private
 */
Curl.prototype._log = function( text ) {

    if ( this.debug ) {

        console.info( ( "[cURL " + this._id + "] " ) + text );
    }
};

/**
 *
 * @param {String|Number} optionIdOrName Option id or name. See {@link Curl.option} for predefined constants.
 * @param {*} optionValue Value is relative to what option you are using.
 * @returns {Number} cURL code for given call.
 */
Curl.prototype.setOpt = function( optionIdOrName, optionValue ) {

    return this._setOpt( optionIdOrName, optionValue );
}

/**
 * @param {String|Number} infoNameOrId Info id or name. See {@link Curl.info} for predefined constants.
 * @returns {*} Return type is based on the info requested.
 */
Curl.prototype.getInfo = function ( infoNameOrId ) {
    return this._getInfo( infoNameOrId );
};

/**
 * Add this instance to the processing queue.
 * @returns {Curl}
 */
Curl.prototype.perform = function () {

    if ( this._isRunning ) {

        throw Error( 'cURL session is busy.' );
    }

    this._isRunning = true;

    this._perform();

    return this;
};

/**
 * Reset this handler options to their defaults.
 * @returns {Curl}
 */
Curl.prototype.reset = function() {

    return this._reset();
};

/**
 * Close this handler.
 * <strong>NOTE:</strong> After closing the handler, it should not be used anymore!
 */
Curl.prototype.close = function() {

    delete curls[this._id];
    this._close();
};

//clear all curls that are still alive
process.on( 'exit', function() {

    for ( var k in curls )
        delete curls[k];

});

module.exports = Curl;
