'use strict';
/**
 * @file This file creates and exposes the Curl class to the user.
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
const binary = require('node-pre-gyp');
const path = require('path');
const bindingPath = binary.find(path.resolve(path.join(__dirname, './../package.json')));
const _Curl = require(bindingPath).Curl;
const Easy = require('./Easy');
const Multi = require('./Multi');
const util = require('util');
const assert = require('assert');
const StringDecoder = require('string_decoder').StringDecoder;
const EventEmitter = require('events').EventEmitter;

const decoder = new StringDecoder('utf8');
// Handle used by curl instances created by the Curl wrapper.
const multiHandle = new Multi();
const curls = {};

multiHandle.onMessage(function(err, handle, errCode) {
  multiHandle.removeHandle(handle);

  const curl = curls[handle.id];

  assert(curl);

  if (err) {
    curl._onError(err, errCode);
  } else {
    curl._onEnd();
  }
});

/**
 * @module node-libcurl
 */

/**
 * Wrapper class around one easy handle.
 * It provides a more *nodejs-friendly* interface.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @alias module:node-libcurl.Curl
 */

const Curl = (module.exports = function Curl(handle) {
  EventEmitter.call(this);

  // create the new curl handle instance
  if (!handle) {
    handle = new Easy();
  }

  /**
   * @type {Easy}
   * @private
   */
  this._handle = handle;

  // callbacks called by libcurl
  this._handle.setOpt(_Curl.option.WRITEFUNCTION, this._onData.bind(this));
  this._handle.setOpt(_Curl.option.HEADERFUNCTION, this._onHeader.bind(this));

  this._id = this._handle.id;
  this._chunks = [];
  this._headerChunks = [];
  this._chunksLength = 0;
  this._headerChunksLength = 0;
  this._isRunning = false;
  this._features = 0;

  /**
   * Use {@link module:node-libcurl.Curl#setOpt}( Curl.option.WRITEFUNCTION, onDataCallback ) instead.
   * @deprecated
   * @type {module:node-libcurl.Easy~onDataCallback}
   */
  this.onData = null;

  /**
   * Use {@link module:node-libcurl.Curl#setOpt}( Curl.option.HEADERFUNCTION, onHeaderCallback ) instead.
   * @deprecated
   * @type {module:node-libcurl.Easy~onHeaderCallback}
   */
  this.onHeader = null;

  curls[this._id] = this;
});

util.inherits(Curl, EventEmitter);

/**
 * Current libcurl version
 * @const
 */
Curl.VERSION_NUM = _Curl.VERSION_NUM;

/**
 * Options to be used with easy.setOpt or curl.setOpt
 * See the official documentation of [curl_easy_setopt()]{@link http://curl.haxx.se/libcurl/c/curl_easy_setopt.html} for reference.
 *
 * ``CURLOPT_URL`` becomes ``Curl.option.URL``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.option = _Curl.option;

/**
 * Options to be used with multi.setOpt()
 *
 * ``CURLMOPT_MAXCONNECTS`` becomes ``Curl.multi.MAXCONNECTS``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.multi = _Curl.multi;

//@TODO Should we freeze the enums?
/*eslint camelcase: [2, {properties: "never"}]*/

/**
 * Options to be used with share.setOpt()
 *
 * @enum {Number}
 * @static
 * @readonly
 * @see module:node-libcurl.Curl.lock
 */
Curl.share = {
  SHARE: 1,
  UNSHARE: 2,
};

/**
 * Options to be used with the Curl.share.SHARE and Curl.share.UNSHARE options.
 *
 * ``CURL_LOCK_DATA_COOKIE`` becomes ``Curl.lock.DATA_COOKIE``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.lock = {
  DATA_COOKIE: 2,
  DATA_DNS: 3,
  DATA_SSL_SESSION: 4,
};

/**
 * Infos to be used with easy.getInfo() or curl.getInfo()
 * See the official documentation of [curl_easy_getinfo()]{@link http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html} for reference.
 *
 * ``CURLINFO_EFFECTIVE_URL`` becomes ``Curl.info.EFFECTIVE_URL``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.info = _Curl.info;

/**
 * Object with bitmasks that should be used with the HTTPAUTH option.
 *
 * ``CURLAUTH_BASIC`` becomes ``Curl.auth.BASIC``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.auth = _Curl.auth;

/**
 * Object with constants to be used with the HTTP_VERSION option.
 *
 * ``CURL_HTTP_VERSION_NONE`` becomes ``Curl.http.VERSION_NONE``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.http = _Curl.http;

/**
 * Object with constants to be used with the pause method.
 *
 * ``CURLPAUSE_RECV`` becomes ``Curl.pause.RECV``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.pause = _Curl.pause;

/**
 * Object with the protocols supported by libcurl, as bitmasks.
 * Should be used when setting PROTOCOLS and REDIR_PROTOCOLS options.
 *
 * ``CURLPROTO_HTTP`` becomes ``Curl.proto.HTTP``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.protocol = _Curl.protocol;

if (Curl.VERSION_NUM >= 0x072500) {
  /**
   * Object with the avaialable bitmasks to be used with HEADEROPT.
   *
   * Available since libcurl version >= 7.37.0
   *
   * ``CURLHEADER_UNIFIED`` becomes ``Curl.header.UNIFIED``
   *
   * @enum {Number}
   * @static
   * @readonly
   */
  Curl.header = _Curl.header;
}

/**
 * When the option Curl.option.DEBUGFUNCTION is set,
 *  the first argument to the callback will be one of these.
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.info.debug = {
  TEXT: 0,
  HEADER_IN: 1,
  HEADER_OUT: 2,
  DATA_IN: 3,
  DATA_OUT: 4,
  SSL_DATA_IN: 5,
  SSL_DATA_OUT: 6,
};

/**
 * Object with the CURLM_ and CURLE_ constants.
 *
 * ``CURLE_OK`` becomes ``Curl.code.CURLE_OK``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.code = _Curl.code;

/**
 * Object with constants to be used with NETRC option.
 *
 * ``CURL_NETRC_OPTIONAL`` becomes ``Curl.netrc.OPTIONAL``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.netrc = {
  /**
   * The .netrc will never be read. Default.
   */
  IGNORED: 0,

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
  REQUIRED: 2,
};

/**
 * Object with constants to be used as the return value for the callbacks set
 *  with the options ``CHUNK_BGN_FUNCTION`` and ``CHUNK_END_FUNCTION``.
 *
 * ``CURL_CHUNK_BGN_FUNC_OK`` becomes ``Curl.chunk.BGN_FUNC_OK``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.chunk = {
  BGN_FUNC_OK: 0,
  BGN_FUNC_FAIL: 1,
  BGN_FUNC_SKIP: 2,

  END_FUNC_OK: 0,
  END_FUNC_FAIL: 1,
};

/**
 * Object with constants to be used when using the {@link module:node-libcurl#CurlFileInfo} object,
 *  mostly used alongside the ``CHUNK_BGN_FUNCTION`` option
 *
 * ``CURLFILETYPE_FILE`` becomes ``Curl.filetype.FILE``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.filetype = {
  FILE: 0,
  DIRECTORY: 1,
  SYMLINK: 2,
  DEVICE_BLOCK: 3,
  DEVICE_CHAR: 4,
  NAMEDPIPE: 5,
  SOCKET: 6,
  DOOR: 7,
};

/**
 * Object with constants to be used as the return value for the callback set
 *  with the option ``FNMATCH_FUNCTION``.
 *
 * ``CURL_FNMATCHFUNC_MATCH`` becomes ``Curl.fnmatchfunc.MATCH``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.fnmatchfunc = {
  MATCH: 0,
  NOMATCH: 1,
  FAIL: 2,
};

/**
 * Object with constants for option ``FTPSSLAUTH``
 *
 * ``CURLFTPAUTH_DEFAULT`` becomes ``Curl.ftpauth.DEFAULT``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.ftpauth = {
  /* let libcurl decide */
  DEFAULT: 0,
  /* use "AUTH SSL" */
  SSL: 1,
  /* use "AUTH TLS" */
  TLS: 2,
};

/**
 * Object with constants for option ``FTP_SSL_CCC``
 *
 * ``CURLFTPSSL_CCC_NONE`` becomes ``Curl.ftpssl.CCC_NONE``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.ftpssl = {
  /* do not send CCC */
  CCC_NONE: 0,
  /* Let the server initiate the shutdown */
  CCC_PASSIVE: 1,
  /* Initiate the shutdown */
  CCC_ACTIVE: 2,
};

/**
 * Object with constants for option ``FTP_FILEMETHOD``
 *
 * ``CURLFTPMETHOD_MULTICWD`` becomes ``Curl.ftpmethod.MULTICWD``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.ftpmethod = {
  /* let libcurl pick */
  DEFAULT: 0,
  /* single CWD operation for each path part */
  MULTICWD: 1,
  /* no CWD at all */
  NOCWD: 2,
  /* one CWD to full dir, then work on file */
  SINGLECWD: 3,
};

if (Curl.VERSION_NUM >= 0x071400) {
  //7.20.0

  /**
   * Object with constants for option ``RTSP_REQUEST``
   * Only available on libcurl >= 7.20
   *
   * ``CURL_RTSPREQ_OPTIONS`` becomes ``Curl.rtspreq.OPTIONS``
   *
   * @enum {Number}
   * @static
   * @readonly
   */
  Curl.rtspreq = {
    OPTIONS: 0,
    DESCRIBE: 1,
    ANNOUNCE: 2,
    SETUP: 3,
    PLAY: 4,
    PAUSE: 5,
    TEARDOWN: 6,
    GET_PARAMETER: 7,
    SET_PARAMETER: 8,
    RECORD: 9,
    RECEIVE: 10,
  };
}

/**
 * Object with constants for option ``IPRESOLVE``
 *
 * ``CURL_IPRESOLVE_V4`` becomes ``Curl.ipresolve.V4``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.ipresolve = {
  /* default, resolves addresses to all IP
     versions that your system allows */
  WHATEVER: 0,
  /* resolve to IPv4 addresses */
  V4: 1,
  /* resolve to IPv6 addresses */
  V6: 2,
};

/**
 * Object with constants for option ``PROXYTYPE``
 *
 * ``CURLPROXY_HTTP`` becomes ``Curl.proxy.HTTP``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.proxy = {
  HTTP: 0,
  HTTP_1_0: 1,
  SOCKS4: 4,
  SOCKS5: 5,
  SOCKS4A: 6,
  SOCKS5_HOSTNAME: 7,
};

/**
 *
 * Object with bit constants to be used with the multi handle option ``PIPELINING``
 * Those are available starting with libcurl 7.43.0.
 *
 * ``CURLPIPE_NOTHING`` becomes ``Curl.pipe.NOTHING``
 *
 * @see https://curl.haxx.se/libcurl/c/CURLMOPT_PIPELINING.html
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.pipe = {
  NOTHING: 0, //Default, which means doing no attempts at pipelining or multiplexing.
  HTTP1: 1, //If this bit is set, libcurl will try to pipeline HTTP/1.1 requests on connections that are already established and in use to hosts.
  MULTIPLEX: 2, //If this bit is set, libcurl will try to multiplex the new transfer over an existing connection if possible. This requires HTTP/2.
};

/**
 * Object with constants for option ``USE_SSL``
 *
 * ``CURLUSESSL_NONE`` becomes ``Curl.usessl.NONE``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.usessl = {
  /* do not attempt to use SSL */
  NONE: 0,
  /* try using SSL, proceed anyway otherwise */
  TRY: 1,
  /* SSL for the control connection or fail */
  CONTROL: 2,
  /* SSL for all communication or fail */
  ALL: 3,
};

/**
 * Object with constants for option ``SSLVERSION``
 *
 * ``CURL_SSLVERSION_DEFAULT`` becomes ``Curl.sslversion.DEFAULT``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.sslversion = {
  DEFAULT: 0,
  TLSv1: 1,
  SSLv2: 2,
  SSLv3: 3,
};

if (Curl.VERSION_NUM >= 0x072200) {
  //7.34.0
  Curl.sslversion.TLSv1_0 = 4;
  Curl.sslversion.TLSv1_1 = 5;
  Curl.sslversion.TLSv1_2 = 6;
}

if (Curl.VERSION_NUM >= 0x073400) {
  //7.52.0
  Curl.sslversion.TLSv1_3 = 7;
}

if (Curl.VERSION_NUM >= 0x073600) {
  //7.54.0
  Curl.sslversion.max = {};
  Curl.sslversion.max.DEFAULT = Curl.sslversion.TLSv1 << 16;
  Curl.sslversion.max.TLSv1_0 = Curl.sslversion.TLSv1_0 << 16;
  Curl.sslversion.max.TLSv1_1 = Curl.sslversion.TLSv1_1 << 16;
  Curl.sslversion.max.TLSv1_2 = Curl.sslversion.TLSv1_2 << 16;
  Curl.sslversion.max.TLSv1_3 = Curl.sslversion.TLSv1_3 << 16;
}

/**
 * Object with constants for option ``SSH_AUTH_TYPES``
 *
 * ``CURLSSH_AUTH_PASSWORD`` becomes ``Curl.ssh_auth.PASSWORD``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.ssh_auth = {
  /* all types supported by the server */
  ANY: ~0,
  /* none allowed, silly but complete */
  NONE: 0,
  /* public/private key files */
  PUBLICKEY: 1 << 0,
  /* password */
  PASSWORD: 1 << 1,
  /* host key files */
  HOST: 1 << 2,
  /* keyboard interactive */
  KEYBOARD: 1 << 3,
};

if (Curl.VERSION_NUM >= 0x071c00) {
  //7.28.0
  /* agent (ssh-agent, pageant...) */
  Curl.ssh_auth.AGENT = 1 << 4;
}

/**
 * Object with constants for option ``TIMECONDITION``
 *
 * ``CURL_TIMECOND_IFMODSINCE`` becomes ``Curl.timecond.IFMODSINCE``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.timecond = {
  IFMODSINCE: 0,
  IFUNMODSINCE: 1,
};

/**
 * Object with the features currently supported as bitmasks.
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.feature = {
  /**
   * Data received is passed as a Buffer to the end event.
   * @type {Number}
   */
  NO_DATA_PARSING: 1 << 0,

  /**
   * Header received is not parsed, it's passed as a Buffer to the end event.
   * @type {Number}
   */
  NO_HEADER_PARSING: 1 << 1,

  /**
   * Same than ``NO_DATA_PARSING | NO_HEADER_PARSING``
   * @type {Number}
   */
  RAW: (1 << 0) | (1 << 1),

  /**
   * Data received is not stored inside this handle, implies NO_DATA_PARSING.
   * @type {Number}
   */
  NO_DATA_STORAGE: 1 << 2,

  /**
   * Header received is not stored inside this handle, implies NO_HEADER_PARSING.
   * @type {Number}
   */
  NO_HEADER_STORAGE: 1 << 3,

  /**
   * Same than ``NO_DATA_STORAGE | NO_HEADER_STORAGE``, implies RAW.
   * @type {Number}
   */
  NO_STORAGE: (1 << 2) | (1 << 3),
};

const features = Curl.feature;

/**
 * Returns the number of handles currently open in the internal multi handle being used.
 *
 * @return {Number}
 */
Curl.getCount = multiHandle.getCount.bind(multiHandle);

/**
 * Returns libcurl version string.
 * The string shows which features are enabled,
 *  and the version of the libraries that libcurl was built with.
 *
 * @return {String}
 */
Curl.getVersion = _Curl.getVersion;

//https://github.com/curl/curl/blob/master/include/curl/curl.h#L2314

/**
 * Object with constants for the function {@link module:node-libcurl.Curl.globalInit}
 *
 * ``CURL_GLOBAL_ALL`` becomes ``Curl.global.ALL``
 *
 * @enum {Number}
 * @static
 * @readonly
 */
Curl.global = {
  SSL: 1 << 0,
  WIN32: 1 << 1,
  ALL: (1 << 0) | (1 << 1),
  DEFAULT: (1 << 0) | (1 << 1),
  NOTHING: 0,
  ACK_EINTR: 1 << 2,
};

/**
 * Calls [curl_global_init()]{@link http://curl.haxx.se/libcurl/c/curl_global_init.html}
 * @param {Number} flags Flag of options, see {@link module:node-libcurl.Curl.global}
 *
 * @return {Number} Status code, see {@link module:node-libcurl.Curl.code}
 */
Curl.globalInit = _Curl.globalInit;

/**
 * Calls [curl_global_cleanup()]{@link http://curl.haxx.se/libcurl/c/curl_global_cleanup.html}
 */
Curl.globalCleanup = _Curl.globalCleanup;

/**
 * This function is used to merge the buffers
 *  that were stored while the request was being processed.
 *
 * @param {Array.<Buffer>} chunks Array of Buffers that were stored during request.
 * @param {Number} length Sum of the length of all buffers stored in the chunks Array
 * @return {Buffer}
 *
 * @ignore
 */
function _mergeChunks(chunks, length) {
  //@fixme deprecated buffer initialization on nodejs 6
  // see https://nodejs.org/api/buffer.html#buffer_buffer_from_buffer_alloc_and_buffer_allocunsafe
  //     https://github.com/nodejs/node/pull/4682
  const data = new Buffer(length);
  const len = chunks.length;

  let pos = 0;

  for (let i = 0; i < len; i++) {
    const chunk = chunks[i];
    chunk.copy(data, pos);
    pos += chunk.length;
  }

  return data;
}

/**
 * Parses the headers that were stored while
 *  the request was being processed.
 *
 * @param {String} headersString
 * @return {Array}
 *
 * @ignore
 */
function _parseHeaders(headersString) {
  const headers = headersString.split(/\r?\n|\r/g);
  const len = headers.length;
  const result = [];

  let isStatusLine = true;
  let currHeaders = {};

  for (let i = 0; i < len; i++) {
    // status line
    if (isStatusLine) {
      const header = headers[i].split(' ');

      currHeaders.result = {
        version: header.shift(),
        code: parseInt(header.shift(), 10),
        reason: header.join(' '),
      };

      isStatusLine = false;

      continue;
    }

    // Empty string means empty line, which means another header group
    if (headers[i] === '') {
      result.push(currHeaders);
      currHeaders = {};

      isStatusLine = true;

      continue;
    }

    const header = headers[i].split(/:\s(.+)/);
    if (header[0].toUpperCase() == 'SET-COOKIE') {
      if (!currHeaders['Set-Cookie']) {
        currHeaders['Set-Cookie'] = [];
      }

      currHeaders['Set-Cookie'].push(header[1]);
    } else {
      currHeaders[header[0]] = header[1];
    }
  }

  return result;
}

/**
 * @param {Buffer} chunk
 * @param {Number} size
 * @param {Number} nmemb
 * @returns {Number} This value is used by the native caller and must be equals the length of the data received.
 * @emits module:node-libcurl.Curl#data
 *
 * @private
 */
Curl.prototype._onData = function(chunk, size, nmemb) {
  let ret = size * nmemb;

  if (this.onData) {
    if (typeof this.onData === 'function') {
      ret = this.onData(chunk);
    } else {
      throw Error('onData must be a function.');
    }
  }

  if (!(this._features & features.NO_DATA_STORAGE)) {
    this._chunks.push(chunk);
    this._chunksLength += chunk.length;
  }

  /**
   * Data event
   *
   * @event module:node-libcurl.Curl#data
   * @param {Buffer} chunk The data that was received.
   */
  this.emit('data', chunk);

  return ret;
};

/**
 * Same than {@link module:node-libcurl.Curl#_onData} but for the headers.
 * @param {Buffer} chunk
 * @returns {Number}
 * @emits module:node-libcurl.Curl#event:header
 *
 * @private
 */
Curl.prototype._onHeader = function(chunk /*, size, nmemb*/) {
  let ret = chunk.length;

  if (this.onHeader) {
    if (typeof this.onHeader === 'function') {
      ret = this.onHeader(chunk);
    } else {
      throw Error('onHeader must be a function.');
    }
  }

  if (!(this._features & features.NO_HEADER_STORAGE)) {
    this._headerChunks.push(chunk);
    this._headerChunksLength += chunk.length;
  }

  /**
   * Header event
   *
   * @event module:node-libcurl.Curl#header
   * @param {Buffer} chunk The header that was received.
   */
  this.emit('header', chunk);

  return ret;
};

/**
 * Event called when an error is thrown on this handle.
 *
 * @param {Error} err Exception obj
 * @param {Number} errCode Curl error code.
 * @emits module:node-libcurl.Curl#event:error
 *
 * @private
 */
Curl.prototype._onError = function(err, errCode) {
  this._isRunning = false;

  /**
   * Error event
   *
   * @event module:node-libcurl.Curl#error
   * @param {Error} err Error object
   * @param {Number} errCode libcurl error code.
   */
  this.emit('error', err, errCode);
};

/**
 * Called when this handle has finished the connection.
 *
 * @emits module:node-libcurl.Curl#event:end
 *
 * @private
 */
Curl.prototype._onEnd = function() {
  const isHeaderStorageEnabled = !(this._features & features.NO_HEADER_STORAGE);
  const isDataStorageEnabled = !(this._features & features.NO_DATA_STORAGE);
  const isHeaderParsingEnabled = !(this._features & features.NO_HEADER_PARSING) && isHeaderStorageEnabled;
  const isDataParsingEnabled = !(this._features & features.NO_DATA_PARSING) && isDataStorageEnabled;

  this._isRunning = false;

  const data = isDataStorageEnabled ? _mergeChunks(this._chunks, this._chunksLength) : new Buffer(0);
  const header = isHeaderStorageEnabled ? _mergeChunks(this._headerChunks, this._headerChunksLength) : new Buffer(0);

  this._chunks = [];
  this._headerChunks = [];
  this._chunksLength = 0;
  this._headerChunksLength = 0;

  const argBody = isDataParsingEnabled ? decoder.write(data) : data;
  const argHeader = isHeaderParsingEnabled ? _parseHeaders(decoder.write(header)) : header;

  const status = this._handle.getInfo(Curl.info.RESPONSE_CODE).data;

  /**
   * End event
   *
   * @event module:node-libcurl.Curl#end
   * @param {Number} status Last received response code
   * @param {String|Buffer} argBody If [Curl.feature.NO_DATA_PARSING]{@link module:node-libcurl.Curl.feature} is set, a Buffer is passed instead of a string.
   * @param {Array|Buffer} argBody If [Curl.feature.NO_HEADER_PARSING]{@link module:node-libcurl.Curl.feature} is set, a Buffer is passed instead of an array with the headers.
   */
  this.emit('end', status, argBody, argHeader);
};

/**
 * Internal method used for logging when debug is enabled. Currently not in use.
 * @param {String} text
 * @private
 */
Curl.prototype._log = function(text) {
  if (this.debug) {
    // eslint-disable-next-line no-console
    console.info('[cURL ' + this._id + '] ' + text);
  }
};

/**
 * Enables a feature, should not be used while a request is running.
 * Check {@link module:node-libcurl.Curl.feature}.
 *
 * @param {Number} bitmask Bitmask with the features to enable
 * @return {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.enable = function(bitmask) {
  if (this._isRunning) {
    throw Error('You should not change the features while a request is running.');
  }

  this._features |= bitmask;

  return this;
};

/**
 * Disables a feature, should not be used while a request is running.
 * Check {@link module:node-libcurl.Curl.feature}.
 *
 * @param {Number} bitmask Bitmask with the features to disable
 * @return {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.disable = function(bitmask) {
  if (this._isRunning) {
    throw Error('You should not change the features while a request is running.');
  }

  this._features &= ~bitmask;

  return this;
};

/**
 * Use {@link module:node-libcurl.Curl.option} for predefined constants.
 * @param {String|Number} optionIdOrName Option id or name.
 * @param {*} optionValue Value is relative to what option you are using.
 * @returns {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.setOpt = function(optionIdOrName, optionValue) {
  // special case for WRITEFUNCTION and HEADERFUNCTION callbacks
  //  since if they are set back to null, we must restore the default callback.
  if ((optionIdOrName === Curl.option.WRITEFUNCTION || optionIdOrName === 'WRITEFUNCTION') && !optionValue) {
    optionValue = this._onData.bind(this);
  } else if (optionIdOrName === Curl.option.HEADERFUNCTION || (optionIdOrName === 'HEADERFUNCTION' && !optionValue)) {
    optionValue = this._onHeader.bind(this);
  }

  const ret = this._handle.setOpt(optionIdOrName, optionValue);

  if (ret !== Curl.code.CURLE_OK) {
    throw Error(
      ret === Curl.code.CURLE_UNKNOWN_OPTION
        ? 'Unknown option given. First argument must be the option internal id or the option name. You can use the Curl.option constants.'
        : Easy.strError(ret)
    );
  }

  return this;
};

/**
 * Use {@link module:node-libcurl.Curl.info} for predefined constants.
 *
 * @param {String|Number} infoNameOrId Info id or name.
 * @returns {String|Number|Array} Return type is based on the info requested.
 */
Curl.prototype.getInfo = function(infoNameOrId) {
  const ret = this._handle.getInfo(infoNameOrId);

  if (ret.code !== Curl.code.CURLE_OK) {
    throw Error('getInfo failed. Error: ' + Easy.strError(ret.code));
  }

  return ret.data;
};

/**
 * Progress callback called by libcurl.
 *
 * @callback module:node-libcurl.Curl~progressCallback
 *
 * @param {Number} dltotal Total number of bytes libcurl expects to download in this transfer.
 * @param {Number} dlnow Number of bytes downloaded so far.
 * @param {Number} ultotal Total number of bytes libcurl expects to upload in this transfer.
 * @param {Number} ulnow Number of bytes uploaded so far.
 *
 * @this {module:node-libcurl.Easy}
 *
 * @return {Number} Returning a non-zero value from this callback will cause libcurl to abort the transfer and return CURLE_ABORTED_BY_CALLBACK.
 */

/**
 * The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
 *  versions older than that should use PROGRESSFUNCTION.
 * If you don't want to mess with version numbers you can use this method,
 * instead of directly calling {@link module:node-libcurl.Curl#setOpt}.
 *
 * NOPROGRESS should be set to false to make this function actually get called.
 *
 * @param {module:node-libcurl.Curl~progressCallback} cb
 * @returns {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.setProgressCallback = function(cb) {
  if (Curl.VERSION_NUM >= 0x072000) {
    this._handle.setOpt(Curl.option.XFERINFOFUNCTION, cb);
  } else {
    this._handle.setOpt(Curl.option.PROGRESSFUNCTION, cb);
  }

  return this;
};

/**
 * Add this instance to the processing queue.
 * @throws This method should be called only one time per request,
 *  otherwise it will throw an exception.
 *
 * @return {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.perform = function() {
  if (this._isRunning) {
    throw Error('Handle already running!');
  }

  this._isRunning = true;

  multiHandle.addHandle(this._handle);

  return this;
};

/**
 * Using this function, you can explicitly mark a running connection to get paused, and you can unpause a connection that was previously paused.
 *
 * The bitmask argument is a set of bits that sets the new state of the connection.
 *
 * @param {module:node-libcurl.Curl.pause} bitmask
 * @return {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.pause = function(bitmask) {
  const ret = this._handle.pause(bitmask);

  if (ret !== Curl.code.CURLE_OK) {
    throw Error(Easy.strError(ret));
  }

  return this;
};

/**
 * Reset this handle options to their defaults.
 * @return {module:node-libcurl.Curl} <code>this</code>
 */
Curl.prototype.reset = function() {
  //Do we need to remove listeners here?
  this._handle.reset();

  return this;
};

/**
 * Duplicate this handle with all their options.
 * Keep in mind that, by default, this also means anonymous functions
 * that were set as callbacks and all event listeners.
 *
 * Using the arguments to change that behaviour.
 *
 * @param {Boolean} [shouldCopyCallbacks=true] Should copy onData and onHeader callbacks
 * @param {Boolean} [shouldCopyEventListeners=true] Should copy current event listeners
 * @return {module:node-libcurl.Curl} New handle with all the options set in this handle.
 */
Curl.prototype.dupHandle = function(shouldCopyCallbacks, shouldCopyEventListeners) {
  shouldCopyCallbacks = typeof shouldCopyCallbacks === 'undefined' ? true : shouldCopyCallbacks;
  shouldCopyEventListeners = typeof shouldCopyEventListeners === 'undefined' ? true : shouldCopyEventListeners;

  const duplicatedHandle = new Curl(this._handle.dupHandle());
  const eventsToCopy = ['end', 'error'];

  duplicatedHandle._features = this._features;

  if (shouldCopyCallbacks) {
    duplicatedHandle.onData = this.onData;
    duplicatedHandle.onHeader = this.onHeader;
  }

  if (shouldCopyEventListeners) {
    for (let i = 0; i < eventsToCopy.length; i++) {
      const listeners = this.listeners(eventsToCopy[i]);

      for (let j = 0; j < listeners.length; j++) {
        duplicatedHandle.on(eventsToCopy[i], listeners[j]);
      }
    }
  }

  return duplicatedHandle;
};

/**
 * Close this handle.
 * <strong>NOTE:</strong> After closing the handle, it should not be used anymore!
 * Doing so will throw an exception.
 */
Curl.prototype.close = function() {
  delete curls[this._id];

  this.removeAllListeners();

  if (this._handle.isInsideMultiHandle) {
    multiHandle.removeHandle(this._handle);
  }

  this._handle.setOpt(_Curl.option.WRITEFUNCTION, null);
  this._handle.setOpt(_Curl.option.HEADERFUNCTION, null);

  this._handle.close();
};

//clear all curls that are still alive
process.on('exit', function() {
  for (let k in curls) {
    if (curls.hasOwnProperty(k)) {
      curls[k].close();
    }
  }

  multiHandle.close();
});
