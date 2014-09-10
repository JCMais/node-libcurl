/**
 * @class
 * @extends EventEmitter
 */
var Curl = require( 'bindings' )( 'node-libcurl' ).Curl;

Curl.info = (Curl.info || {});

// For use with Curl.option.DEBUG.
// The first paremeter is one of these.
Curl.info.debug = {
    TEXT : 0,
    HEADER_IN : 1,
    HEADER_OUT: 2,
    DATA_IN : 3,
    DATA_OUT: 4,
    SSL_DATA_IN : 5,
    SSL_DATA_OUT: 6
};

// For use with Curl.option.NETRC
Curl.netrc = {
    /**
     * The .netrc will never be read. Default.
     */
    IGNORED : 0,
    /**
     * A user:password in the URL will be preferred
     * to one in the .netrc.
     */
    OPTIONAL: 1,
    /**
     * A user:password in the URL will be ignored.
     * Unless one is set programmatically, the .netrc
     * will be queried.
     */
    REQUIRED: 2
};

/**
 * @type {Object}
 * @readonly
 */
Curl.feature = {
    NO_DATA_PARSING : 1 << 0,
    NO_HEADER_PARSING : 1 << 1,
    NO_DATA_STORAGE   : 1 << 2,
    NO_HEADER_STORAGE : 1 << 3
};

Curl.feature.RAW = Curl.feature.NO_DATA_PARSING | Curl.feature.NO_HEADER_PARSING;
Curl.feature.NO_STORAGE = Curl.feature.NO_DATA_STORAGE | Curl.feature.NO_HEADER_STORAGE;

var util = require( 'util' ),
    StringDecoder = require( 'string_decoder' ).StringDecoder,
    decoder = new StringDecoder( 'utf8' ),
    EventEmitter = require( 'events' ).EventEmitter,
    id = 0,
    curls = {},
    features = Curl.feature;

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

//Node utils.inherits replaces the child prototype, so it cannot be used with native modules
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

var defaultOnData   = function( chunk ) { return chunk.length; },
    defaultOnHeader = defaultOnData;

/**
 * Event called after the constructor,
 * so we can do some initialization here.
 * @private
 */
Curl.prototype._onCreated = function() {

    this._id = ++id;
    this._chunks = [];
    this._headerChunks = [];

    this._chunksLength = 0;
    this._headerChunksLength = 0;
    this._isRunning = false;

    this.onData   = defaultOnData;
    this.onHeader = defaultOnHeader;

    this.features = 0;

    curls[this._id] = this;
};

/**
 * @param {Buffer} chunk
 * @returns {Number} This value is used by the native caller and must be equals the length of the data received.
 * @private
 */
Curl.prototype._onData    = function( chunk ) {

    var ret;

    if ( typeof this.onData == 'function' )
        ret = this.onData( chunk );
    else
        throw Error( 'onData must be a function.' );

    if ( !( this.features & features.NO_DATA_STORAGE ) ) {
        this._chunks.push( chunk );
        this._chunksLength += chunk.length;
    }

    this.emit( 'data', chunk );

    return ret;
};

/**
 * Same than {@link _onData} but for the headers.
 * @param chunk
 * @returns {Number}
 * @private
 */
Curl.prototype._onHeader  = function( chunk ) {

    var ret;

    if ( typeof this.onHeader == 'function' )
        ret = this.onHeader( chunk );
    else
        throw Error( 'onHeader must be a function.' );

    if ( !( this.features & features.NO_HEADER_STORAGE ) ) {
        this._headerChunks.push( chunk );
        this._headerChunksLength += chunk.length;
    }

    this.emit( 'header', chunk );

    return ret;
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
        self = this,
        isHeaderStorageEnabled = !(this.features & features.NO_HEADER_STORAGE),
        isDataStorageEnabled   = !(this.features & features.NO_DATA_STORAGE),
        isHeaderParsingEnabled = !(this.features & features.NO_HEADER_PARSING) && isHeaderStorageEnabled,
        isDataParsingEnabled   = !(this.features & features.NO_DATA_PARSING) && isDataStorageEnabled;

    this._isRunning = false;

    data = isDataStorageEnabled ? _mergeChunks( this._chunks, this._chunksLength ) : new Buffer(0);
    header = isHeaderStorageEnabled ? _mergeChunks( this._headerChunks, this._headerChunksLength ) : new Buffer(0);

    this._chunks = [];
    this._headerChunks = [];
    this._chunksLength = 0;
    this._headerChunksLength = 0;

    argBody = isDataParsingEnabled ? decoder.write( data ) : data;
    argHeader = isHeaderParsingEnabled ? _parseHeaders( decoder.write( header ) ) : header;

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
 * Enables a feature, should not be used while a request is running.
 * Check {@link Curl.feature}.
 * @param {Number} bitmask Bitmask with the features to enable
 */
Curl.prototype.enable = function( bitmask ) {

    if ( this._isRunning )
        throw Error( 'You should not change the features while a request is running.' );

    this.features |= bitmask;
};

/**
 * Disables a feature, should not be used while a request is running.
 * Check {@link Curl.feature}.
 * @param bitmask Bitmask with the features to disable
 */
Curl.prototype.disable = function( bitmask ) {

    if ( this._isRunning )
        throw Error( 'You should not change the features while a request is running.' );

    this.features &= ~bitmask;
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
 * @param {Function} cb
 * @returns {Number} cURL code.
 */
Curl.prototype.setProgressCallback = function ( cb ) {

    var ret;

    if ( Curl.VERSION_NUM >= 0x072000 ) {

        ret = this._setOpt( Curl.option.XFERINFOFUNCTION, cb );

    } else {

        ret = this._setOpt( Curl.option.PROGRESSFUNCTION, cb );
    }

    return ret;
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
 * Using this function, you can explicitly mark a running connection to get paused, and you can unpause a connection that was previously paused.
 *
 * The bitmask argument is a set of bits that sets the new state of the connection. The following bits can be used:
 * <pre>
 * Curl.pause.RECV
 *    Pause receiving data. There will be no data received on this connection until this function is called again without this bit set.
 * Curl.pause.SEND
 *    Pause sending data. There will be no data sent on this connection until this function is called again without this bit set.
 * Curl.pause.ALL
 *    Convenience define that pauses both directions.
 * Curl.pause.CONT
 *    Convenience define that unpauses both directions
 * </pre>
 * @returns {Curl}
 */
Curl.prototype.pause = function( bitmask ) {

    return this._pause( bitmask );
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
