/**
 * @file
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

var binary = require( 'node-pre-gyp' ),
    path   = require( 'path' ),
    bindingPath = binary.find( path.resolve( path.join( __dirname, './../package.json' ) ) );

/*eslint no-unused-vars: 0*/
/**
 * Easy handle constructor
 *
 * @constructor
 * @alias module:node-libcurl.Easy
 *
 * @param {Easy} [orig=null] Creates this handle based on another one,
 * this is going to be the same than calling <code>orig.dupHandle();</code>
 */
var Easy = module.exports = require( bindingPath ).Easy;

/**
 * @enum {Number}
 * @static
 * @readonly
 */
Easy.socket = {
    'READABLE' : 1,
    'WRITABLE' : 2
};

/**
 * This literal object is returned for calls that cannot return single values.
 * Like {@link module:node-libcurl.Easy#getInfo} and {@link module:node-libcurl.Easy#send}
 *
 * @typedef module:node-libcurl.Easy~ReturnData
 * @type Object
 * @property {module:node-libcurl.Curl.code} code The return code for the given method call.
 * It should be equals <code>Curl.code.CURLE_OK</code> to be valid.
 * @property {*} data Data returned from the method call.
 */

/**
 * onData callback for taking care of the data we just received.
 * This is basically the
 * [CURLOPT_WRITEFUNCTION]{@link http://curl.haxx.se/libcurl/c/CURLOPT_WRITEFUNCTION.html}
 * option.
 *
 * @callback module:node-libcurl.Easy~onDataCallback
 * @this {module:node-libcurl.Easy}
 *
 * @param {Buffer} buf
 * @param {Number} size
 * @param {Number} nitems
 * @see module:node-libcurl.Easy#onData
 *
 * @returns {Number} The callback must return exactly nmemb * size, otherwise
 * it will signal libcurl to abort the transfer, and return with error code CURLE_WRITE_ERROR.
 *
 * You can return <code>Curl.pause.WRITEFUNC</code> too, this will cause this transfer to become paused.
 */

/**
 * onHeader callback for taking care of the headers we just received.
 * This is basically the
 * [CURLOPT_HEADERFUNCTION]{@link http://curl.haxx.se/libcurl/c/CURLOPT_HEADERFUNCTION.html}
 * option.
 *
 * @callback module:node-libcurl.Easy~onHeaderCallback
 * @this {module:node-libcurl.Easy}
 * @see module:node-libcurl.Easy#onHeader
 *
 * @param {Buffer} buf
 * @param {Number} size
 * @param {Number} nitems
 *
 * @returns {Number} The callback must return exactly nmemb * size, otherwise
 * it will signal libcurl to abort the transfer, and return with error code CURLE_WRITE_ERROR.
 */


/**
 * Use {@link module:node-libcurl.Easy#setOpt}( Curl.option.WRITEFUNCTION, onDataCallback ) instead.
 * @memberof module:node-libcurl.Easy
 * @member {module:node-libcurl.Easy~onDataCallback} onData
 * @instance
 * @deprecated
 */

/**
 * Use {@link module:node-libcurl.Easy#setOpt}( Curl.option.HEADERFUNCTION, onHeaderCallback ) instead.
 * @memberof module:node-libcurl.Easy
 * @member {module:node-libcurl.Easy~onHeaderCallback} onHeader
 * @instance
 * @deprecated
 */

/**
 * Use {@link module:node-libcurl.Curl.option} for predefined constants.
 *
 * Official libcurl documentation: [curl_easy_setopt()]{@link http://curl.haxx.se/libcurl/c/curl_easy_setopt.html}
 *
 * @function module:node-libcurl.Easy#setOpt
 *
 * @param {String|Number} optionIdOrName Option id or name.
 * @param {*} optionValue Value is relative to what option you are using.
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLE_OK</code>.
 */

/**
 * Use {@link module:node-libcurl.Curl.info} for predefined constants.
 *
 * Official libcurl documentation: [curl_easy_getinfo()]{@link http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html}
 *
 * @function module:node-libcurl.Easy#getInfo
 *
 * @param {String|Number} infoNameOrId Info id or name.
 * @returns {module:node-libcurl.Easy~ReturnData} .data will be the requested info
 */

/**
 * Sends arbitrary data over the established connection.
 *
 * Official libcurl documentation: [curl_easy_send()]{@link http://curl.haxx.se/libcurl/c/curl_easy_send.html}
 *
 * @function module:node-libcurl.Easy#send
 *
 * @param {Buffer} buf The data to be sent
 * @returns {module:node-libcurl.Easy~ReturnData} .data will be the numbers of bytes sent.
 */

/**
 * Receives arbitrary data over the established connection.
 *
 * Official libcurl documentation: [curl_easy_recv()]{@link http://curl.haxx.se/libcurl/c/curl_easy_recv.html}
 *
 * @function module:node-libcurl.Easy#recv
 *
 * @param {Buffer} buf The data will be stored inside this Buffer instance.
 * You need to make sure that the buffer has enought space to store it all.
 * @returns {module:node-libcurl.Easy.ReturnData} .data will be the numbers of bytes received.
 */

/**
 * Performs the entire request in a blocking manner and returns when done.
 *
 * Official libcurl documentation: {@link http://curl.haxx.se/libcurl/c/curl_easy_perform.html}
 *
 * @function module:node-libcurl.Easy#perform
 *
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLE_OK</code>.
 */

/**
 * Using this function, you can explicitly mark a running connection
 * to get paused, and you can unpause a connection that was previously paused.
 *
 * Official libcurl documentation: [curl_easy_pause()]{@link http://curl.haxx.se/libcurl/c/curl_easy_pause.html}
 *
 * @function module:node-libcurl.Easy#pause
 *
 * @param {module:node-libcurl.Curl.pause} bitmask bitmask set of bits that sets the new state of the connection.
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLE_OK</code>.
 */

/**
 * Reset this handle to their original state.
 *
 * Official libcurl documentation: [curl_easy_reset()]{@link http://curl.haxx.se/libcurl/c/curl_easy_reset.html}
 *
 * @function module:node-libcurl.Easy#reset
 *
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLE_OK</code>.
 */

/**
 * Duplicate this handle with all their options
 *
 * Official libcurl documentation: [curl_easy_duphandle()]{@link http://curl.haxx.se/libcurl/c/curl_easy_duphandle.html}
 *
 * @function module:node-libcurl.Easy#dupHandle
 *
 * @returns {module:node-libcurl.Easy} handle Returns the new handle.
 */

/**
 * OnSocketEvent callback called when there are changes to the connection socket.
 *
 * @callback module:node-libcurl.Easy~onSocketEventCallback
 * @this {module:node-libcurl.Easy}
 *
 * @param {Error} err Should be null if there are no errors.
 * @param {module:node-libcurl.Easy.socket} events The events that were detected in the socket
 */

/**
 * The only time this method should be used is when one enables
 *  the internal polling of the connection socket used by this handle (by
 *  calling [Easy#monitorSocketEvents]{@link module:node-libcurl.Easy#monitorSocketEvents}),
 *  the callback is going to be called everytime there is some change to the socket.
 *
 *  One use case for that is when using the
 *  [Easy#send]{@link module:node-libcurl.Easy#send}
 *  and [Easy#recv]{@link module:node-libcurl.Easy#recv} methods.
 *
 * @function module:node-libcurl.Easy#onSocketEvent
 *
 * @param {module:node-libcurl.Easy~onSocketEventCallback} cb
 *
 * @returns {module:node-libcurl.Easy} <code>this</code>
 */

/**
 * Start monitoring for events in the connection socket used by this handle.
 *
 * @function module:node-libcurl.Easy#monitorSocketEvents
 * @see module:node-libcurl.Easy#unmonitorSocketEvents
 *
 * @returns {module:node-libcurl.Easy} <code>this</code>
 */

/**
 * Stop monitoring for events in the connection socket used by this handle.
 *
 * @function module:node-libcurl.Easy#unmonitorSocketEvents
 * @see module:node-libcurl.Easy#monitorSocketEvents
 *
 * @returns {module:node-libcurl.Easy} <code>this</code>
 */

/**
 * Close this handle and dispose any resources bound to it.
 * After closed, the handle **MUST** not be used again.
 *
 * This is basically the same than [curl_easy_cleanup()]{@link http://curl.haxx.se/libcurl/c/curl_easy_cleanup.html}
 *
 * @function module:node-libcurl.Easy#close
 */

/**
 * Returns a description for the given error code.
 *
 * Official libcurl documentation: [curl_easy_strerror()]{@link http://curl.haxx.se/libcurl/c/curl_easy_strerror.html}
 *
 * @function module:node-libcurl.Easy.strError
 *
 * @param {module:node-libcurl.Curl.code} code
 * @returns {String}
 */
