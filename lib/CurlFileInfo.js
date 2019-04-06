/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * CurlFileInfo data type, the first parameter
 * passed to the callback set using the option ``CHUNK_BGN_FUNCTION``.
 *
 * @typedef CurlFileInfo
 * @memberof module:node-libcurl
 * @inner
 * @readonly
 *
 * @type Object
 * @property {String} fileName
 * @property {Number} fileType Value to be used with {@link module:node-libcurl.Curl.filetype}
 * @property {Date} time
 * @property {Number} perm
 * @property {Number} uid
 * @property {Number} gid
 * @property {Number} size
 * @property {Number} hardLinks
 * @property {Object} strings
 * @property {String} strings.time
 * @property {String} strings.perm
 * @property {String} strings.user
 * @property {String} strings.group
 * @property {String|Null} strings.target
 */
