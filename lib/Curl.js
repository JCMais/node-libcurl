var _Curl = require( 'bindings' )( 'node-libcurl' ).Curl,
    util  = require( 'util' ),
    StringDecoder = require( 'string_decoder' ).StringDecoder,
    EventEmitter  = require( 'events' ).EventEmitter,
    decoder  = new StringDecoder( 'utf8' ),
    id = 0,
    curls = {};

var defaultOnData = function( chunk ) { return chunk.length; },
    defaultOnHeader = defaultOnData;

/**
 * @constructor
 * @extends EventEmitter
 */
var Curl = function Curl() {

    EventEmitter.call( this );

    // create the new curl handler instance
    this._curl = new _Curl();

    // callbacks called by libcurl
    this._curl.onData  = this._onData.bind( this );
    this._curl.onHeader= this._onHeader.bind( this );
    this._curl.onEnd   = this._onEnd.bind( this );
    this._curl.onError = this._onError.bind( this );

    this._id = ++id;
    this._chunks = [];
    this._headerChunks = [];
    this._chunksLength = 0;
    this._headerChunksLength = 0;
    this._isRunning = false;
    this._features = 0;

    /**
     * If you want a callback more like the
     *  [CURLOPT_WRITEFUNCTION]{@link http://curl.haxx.se/libcurl/c/CURLOPT_WRITEFUNCTION.html} option, use this property to set the callback.
     *  @type {?function(Buffer):Number}
     */
    this.onData   = null;

    /**
     * If you want a callback more like the
     *  [CURLOPT_HEADERFUNCTION]{@link http://curl.haxx.se/libcurl/c/CURLOPT_HEADERFUNCTION.html} option, use this property to set the callback.
     *  @type {?function(Buffer):Number}
     */
    this.onHeader = null;

    curls[this._id] = this;
};

/**
 * Current libcurl version
 * @const
 */
Curl.VERSION_NUM = _Curl.VERSION_NUM;

/**
 * Options to be used with setOpt
 * See {@link http://curl.haxx.se/libcurl/c/curl_easy_setopt.html} for reference.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.option = _Curl.option;

/**
 * Infos to be used with getInfo
 * See {@link http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html} for reference.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.info   = _Curl.info;

/**
 * Object with bitmasks that should be used with the HTTPAUTH option.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.auth   = _Curl.auth;

/**
 * Object with constants to be used with the HTTP_VERSION option.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.http   = _Curl.http;

/**
 * Object with constants to be used with the pause method.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.pause  = _Curl.pause;

/**
 * Object with the protocols supported by libcurl, as bitmasks.
 * Should be used when setting PROTOCOLS and REDIR_PROTOCOLS options.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.protocol    = _Curl.protocol;

if ( Curl.VERSION_NUM >= 0x072500 ) {
    
    /**
     * Object with the avaialable bitmasks to be used with HEADEROPT.
     *
     * Avaialable since libcurl version >= 7.37.0
     * @enum
     * @static
     * @readonly
     */
    Curl.header    = _Curl.header;
}

/**
 * Returns the number of handlers currently open.
 *
 * @function Curl.getCount
 * @retuns {Number}
 */
Curl.getCount   = _Curl.getCount;

/**
 * Returns libcurl version string.
 * The string shows which features are enabled,
 *  and the version of the libraries that libcurl was built with.
 *
 * @function Curl.getVersion
 * @return {String}
 */
Curl.getVersion = _Curl.getVersion;

/**
 * When the option Curl.option.DEBUG is set,
 *  the first argument to the callback will be one of these.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.info.debug = {
    TEXT : 0,
    HEADER_IN : 1,
    HEADER_OUT: 2,
    DATA_IN : 3,
    DATA_OUT: 4,
    SSL_DATA_IN : 5,
    SSL_DATA_OUT: 6
};

/**
 * Object with constants to be used with NETRC option.
 *
 * @enum
 * @static
 * @readonly
 */
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
 * Object with the features currently supported as bitmasks.
 *
 * @enum
 * @static
 * @readonly
 */
Curl.feature = {

    /**
     * Data received is passed as a Buffer to the end event.
     * @type {Number}
     */
    NO_DATA_PARSING : 1 << 0,

    /**
     * Header received is not parsed, it's passed as a Buffer to the end event.
     * @type {Number}
     */
    NO_HEADER_PARSING : 1 << 1,

    /**
     * Same than NO_DATA_PARSING | NO_HEADER_PARSING
     * @type {Number}
     */
    RAW : (1 << 0) | (1 << 1),

    /**
     * Data received is not stored inside this handler, implies NO_DATA_PARSING.
     * @type {Number}
     */
    NO_DATA_STORAGE   : 1 << 2,

    /**
     * Header received is not stored inside this handler, implies NO_HEADER_PARSING.
     * @type {Number}
     */
    NO_HEADER_STORAGE : 1 << 3,

    /**
     * Same than NO_DATA_STORAGE | NO_HEADER_STORAGE, implies RAW.
     * @type {Number}
     */
    NO_STORAGE : (1 << 2) | (1 << 3)
};

var features = Curl.feature;

/**
 * This function is used to merge the buffers
 *  that were stored while the request was being processed.
 *
 * @param chunks
 * @param length
 * @returns {Buffer}
 *
 * @ignore
 */
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

/**
 * Parses the headers that were stored while
 *  the request was being processed.
 *
 * @param {String} headersString
 * @returns {Array}
 *
 * @ignore
 */
function _parseHeaders( headersString ) {

    var headers = headersString.split( /\r?\n|\r/g ),
        i, len, first,
        currHeaders = {},
        result = [],
        header;

    for ( first = true, i = 0, len = headers.length; i < len; i++ ) {

        //status line
        if ( first ) {

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

util.inherits( Curl, EventEmitter );

/**
 * @param {Buffer} chunk
 * @returns {Number} This value is used by the native caller and must be equals the length of the data received.
 * @fires Curl#data
 *
 * @private
 */
Curl.prototype._onData    = function( chunk ) {

    var ret = chunk.length;

    if ( this.onData ) {

        if ( typeof this.onData == 'function' ) {
            ret = this.onData( chunk );
        } else {
            throw Error( 'onData must be a function.' );
        }
    }

    if ( !( this._features & features.NO_DATA_STORAGE ) ) {

        this._chunks.push( chunk );
        this._chunksLength += chunk.length;
    }

    /**
     * Data event
     *
     * @event Curl#data
     * @param {Buffer} chunk Data received.
     */
    this.emit( 'data', chunk );

    return ret;
};

/**
 * Same than {@link Curl#_onData} but for the headers.
 * @param chunk
 * @returns {Number}
 * @fires Curl#event:header
 *
 * @private
 */
Curl.prototype._onHeader  = function( chunk ) {

    var ret = chunk.length;

    if ( this.onHeader ) {

        if ( typeof this.onHeader == 'function' ) {
            ret = this.onHeader( chunk );
        } else {
            throw Error( 'onHeader must be a function.' );
        }
    }

    if ( !( this._features & features.NO_HEADER_STORAGE ) ) {

        this._headerChunks.push( chunk );
        this._headerChunksLength += chunk.length;
    }

    /**
     * Header event
     *
     * @event Curl#header
     * @param {Buffer} chunk Header received.
     */
    this.emit( 'header', chunk );

    return ret;
};

/**
 * Event called when an error is thrown on this handler.
 *
 * @param {Error} err Exception obj
 * @param {Number} errCode Curl error code.
 * @fires Curl#event:error
 *
 * @private
 */
Curl.prototype._onError = function( err, errCode ) {

    this._isRunning = false;

    /**
     * Error event
     *
     * @event Curl#error
     * @param {Error} err Error object
     * @param {Number} errCode libcurl error code.
     */
    this.emit( 'error', err, errCode );
};

/**
 * Called when this handler has finished the connection.
 *
 * @fires Curl#event:end
 *
 * @private
 */
Curl.prototype._onEnd = function() {

    var data, header,
        argBody, argHeader, status,
        isHeaderStorageEnabled = !(this._features & features.NO_HEADER_STORAGE),
        isDataStorageEnabled   = !(this._features & features.NO_DATA_STORAGE),
        isHeaderParsingEnabled = !(this._features & features.NO_HEADER_PARSING) && isHeaderStorageEnabled,
        isDataParsingEnabled   = !(this._features & features.NO_DATA_PARSING) && isDataStorageEnabled;

    this._isRunning = false;

    data = isDataStorageEnabled ? _mergeChunks( this._chunks, this._chunksLength ) : new Buffer(0);
    header = isHeaderStorageEnabled ? _mergeChunks( this._headerChunks, this._headerChunksLength ) : new Buffer(0);

    this._chunks = [];
    this._headerChunks = [];
    this._chunksLength = 0;
    this._headerChunksLength = 0;

    argBody = isDataParsingEnabled ? decoder.write( data ) : data;
    argHeader = isHeaderParsingEnabled ? _parseHeaders( decoder.write( header ) ) : header;

    status = this._curl.getInfo( Curl.info.RESPONSE_CODE );

    /**
     * End event
     *
     * @event Curl#end
     * @param {Number} status Last received response code
     * @param {String|Buffer} argBody If [Curl.feature.NO_DATA_PARSING]{@link Curl.feature} is set, a Buffer is passed instead of a string.
     * @param {Array|Buffer} argBody If [Curl.feature.NO_HEADER_PARSING]{@link Curl.feature} is set, a Buffer is passed instead of an array with the headers.
     */
    this.emit( 'end', status, argBody, argHeader );
};

/**
 * Internal method used for logging when debug is enabled.
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
 *
 * @param {Number} bitmask Bitmask with the features to enable
 * @return {Curl} <code>this</code>
 */
Curl.prototype.enable = function( bitmask ) {

    if ( this._isRunning )
        throw Error( 'You should not change the features while a request is running.' );

    this._features |= bitmask;

    return this;
};

/**
 * Disables a feature, should not be used while a request is running.
 * Check {@link Curl.feature}.
 *
 * @param bitmask Bitmask with the features to disable
 * @return {Curl} <code>this</code>
 */
Curl.prototype.disable = function( bitmask ) {

    if ( this._isRunning )
        throw Error( 'You should not change the features while a request is running.' );

    this._features &= ~bitmask;
};

/**
 * @param {String|Number} optionIdOrName Option id or name. Use {@link Curl.option} for predefined constants.
 * @param {*} optionValue Value is relative to what option you are using.
 * @returns {Number} cURL code for given call. See {@link http://curl.haxx.se/libcurl/c/libcurl-errors.html} for reference.
 */
Curl.prototype.setOpt = function( optionIdOrName, optionValue ) {

    return this._curl.setOpt( optionIdOrName, optionValue );
};

/**
 * @param {String|Number} infoNameOrId Info id or name. Use {@link Curl.info} for predefined constants.
 * @returns {*} Return type is based on the info requested.
 */
Curl.prototype.getInfo = function ( infoNameOrId ) {

    return this._curl.getInfo( infoNameOrId );
};

/**
 * Progress callback called by libcurl.
 *
 * @callback Curl~progressCallback
 *
 * @param {Number} dltotal Total number of bytes libcurl expects to download in this transfer.
 * @param {Number} dlnow Number of bytes downloaded so far.
 * @param {Number} ultotal Total number of bytes libcurl expects to upload in this transfer.
 * @param {Number} ulnow Number of bytes uploaded so far.
 *
 * @return {Number} Returning a non-zero value from this callback will cause libcurl to abort the transfer and return CURLE_ABORTED_BY_CALLBACK.
 */

/**
 * The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
 *  versions older than that should use PROGRESSFUNCTION.
 * If you don't want to mess with version numbers you can use this method,
 * instead of directly calling {@link Curl#setOpt}.
 *
 * NOPROGRESS must be set to false to make this function actually get called.
 *
 * @param {Curl~progressCallback} cb
 * @returns {Number} cURL code for given call. See {@link http://curl.haxx.se/libcurl/c/libcurl-errors.html} for reference.
 */
Curl.prototype.setProgressCallback = function ( cb ) {

    var ret;

    if ( Curl.VERSION_NUM >= 0x072000 ) {

        ret = this._curl.setOpt( Curl.option.XFERINFOFUNCTION, cb );

    } else {

        ret = this._curl.setOpt( Curl.option.PROGRESSFUNCTION, cb );
    }

    return ret;
};


/**
 * Add this instance to the processing queue.
 * @throws This method should be called only one time per request,
 *  otherwise it will throw an exception.
 *
 * @return {Curl} <code>this</code>
 */
Curl.prototype.perform = function () {

    if ( this._isRunning ) {

        throw Error( 'cURL session is busy.' );
    }

    this._isRunning = true;

    this._curl.perform();

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
 *
 * @param {Number} bitmask
 * @return {Curl} <code>this</code>
 */
Curl.prototype.pause = function( bitmask ) {

    return this._curl.pause( bitmask );
};

/**
 * Reset this handler options to their defaults.
 * @return {Curl} <code>this</code>
 */
Curl.prototype.reset = function() {

    //Do we need to remove listeners here?

    return this._curl.reset();
};

/**
 * Close this handler.
 * <strong>NOTE:</strong> After closing the handler, it should not be used anymore!
 * Doing so will throw an exception.
 */
Curl.prototype.close = function() {

    delete curls[this._id];

    this.removeAllListeners();

    this._curl.close();
};

//clear all curls that are still alive
process.on( 'exit', function() {

    for ( var k in curls )
        curls[k].close();

});

module.exports = Curl;
