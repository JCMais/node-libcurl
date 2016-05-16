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
 * Share handle constructor
 *
 * @constructor
 * @alias module:node-libcurl.Share
 */
var Share = module.exports = require( bindingPath ).Share;

/**
 * Use {@link module:node-libcurl.Curl.share} for predefined constants.
 *
 * Official libcurl documentation: [curl_share_setopt()]{@link http://curl.haxx.se/libcurl/c/curl_share_setopt.html}
 *
 * @function module:node-libcurl.Share#setOpt
 *
 * @param {String|Number} optionIdOrName Option id or name.
 * @param {*} optionValue Value is relative to what option you are using.
 * @returns {module:node-libcurl.Curl.code} code Should be <code>Curl.code.CURLSHE_OK</code>.
 */

/**
 * Closes this share handle.
 *
 * This is basically the same than [curl_share_cleanup()]{@link http://curl.haxx.se/libcurl/c/curl_share_cleanup.html}
 *
 * @function module:node-libcurl.Share#close
 */

/**
 * Returns a description for the given error code.
 *
 * Official libcurl documentation: [curl_share_strerror()]{@link http://curl.haxx.se/libcurl/c/curl_share_strerror.html}
 *
 * @function module:node-libcurl.Share.strError
 *
 * @param {module:node-libcurl.Curl.code} code
 * @returns {String}
 */
