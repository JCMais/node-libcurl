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
 * Multi handle constructor
 *
 * @constructor
 * @alias module:node-libcurl.Multi
 */
var Multi = module.exports = require( bindingPath ).Multi;

/**
 * Use {@link module:node-libcurl.Curl.multi} for predefined constants.
 *
 * Official libcurl documentation: [curl_multi_setopt()]{@link http://curl.haxx.se/libcurl/c/curl_multi_setopt.html}
 *
 * @function module:node-libcurl.Multi#setOpt
 *
 * @param {String|Number} optionIdOrName Option id or name.
 * @param {*} optionValue Value is relative to what option you are using.
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLM_OK</code>.
 */

/**
 * Adds an easy handle to be managed by this multi instance.
 *
 * Official libcurl documentation: [curl_multi_add_handle()]{@link http://curl.haxx.se/libcurl/c/curl_multi_add_handle.html}
 *
 * @function module:node-libcurl.Multi#addHandle
 *
 * @param {module:node-libcurl.Easy} handle
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLM_OK</code>.
 */

/**
 * OnMessage callback called when there
 * are new informations about handles inside this multi instance.
 *
 * @callback module:node-libcurl.Multi~onMessageCallback
 * @this {module:node-libcurl.Multi}
 * @see module:node-libcurl.Multi#onMessage
 *
 * @param {Error} err Should be null if there are no errors.
 * @param {module:node-libcurl.Easy} easy The easy handle that triggered the message.
 * @param {module:node-libcurl.Curl.code} errCode
 */

/**
 * This is basically an abstraction over [curl_multi_info_read()]{@link http://curl.haxx.se/libcurl/c/curl_multi_info_read.html}.
 *
 * @function module:node-libcurl.Multi#onMessage
 *
 * @param {module:node-libcurl.Multi~onMessageCallback|null} cb You can pass null to remove the current callback set.
 *
 * @returns {module:node-libcurl.Multi} <code>this</code>
 */

/**
 * Removes an easy handle that was inside this multi instance.
 *
 * Official libcurl documentation: [curl_multi_remove_handle()]{@link http://curl.haxx.se/libcurl/c/curl_multi_remove_handle.html}
 *
 * @function module:node-libcurl.Multi#removeHandle
 *
 * @param {module:node-libcurl.Easy} handle
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLM_OK</code>.
 */

/**
 * Utility method that returns the number of easy handles that are inside this instance.
 *
 * @function module:node-libcurl.Multi#getCount
 * @returns {Number} count
 */

/**
 * Closes this multi handle.
 * Keep in mind that this doesn't closes the easy handles
 * that were still inside this multi instance, you must do it manually.
 *
 * This is basically the same than [curl_multi_cleanup()]{@link http://curl.haxx.se/libcurl/c/curl_multi_cleanup.html}
 *
 * @function module:node-libcurl.Multi#close
 */

/**
 * Returns a description for the given error code.
 *
 * Official libcurl documentation: [curl_multi_strerror()]{@link http://curl.haxx.se/libcurl/c/curl_multi_strerror.html}
 *
 * @function module:node-libcurl.Multi.strError
 *
 * @param {module:node-libcurl.Curl.code} code
 * @returns {String}
 */
