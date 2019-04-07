/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')

const binary = require('node-pre-gyp')

const bindingPath = binary.find(
  path.resolve(path.join(__dirname, './../package.json')),
)

/**
 * Share handle constructor
 *
 * @constructor
 * @alias module:node-libcurl.Share
 */
const Share = (module.exports = require(bindingPath).Share)

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
