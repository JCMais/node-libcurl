/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EventEmitter } from 'events'
import { StringDecoder } from 'string_decoder'
import assert from 'assert'

const pkg = require('../package.json')

import {
  NodeLibcurlNativeBinding,
  EasyNativeBinding,
  FileInfo,
  HttpPostField,
} from './types'

import { Easy } from './Easy'
import { Multi } from './Multi'
import { Share } from './Share'
import { mergeChunks } from './mergeChunks'
import { parseHeaders, HeaderInfo } from './parseHeaders'
import {
  DataCallbackOptions,
  ProgressCallbackOptions,
  StringListOptions,
  CurlOptionName,
  SpecificOptions,
} from './generated/CurlOption'
import { CurlInfoName } from './generated/CurlInfo'

import { CurlChunk } from './enum/CurlChunk'
import { CurlCode } from './enum/CurlCode'
import { CurlFeature } from './enum/CurlFeature'
import { CurlFnMatchFunc } from './enum/CurlFnMatchFunc'
import { CurlFtpMethod } from './enum/CurlFtpMethod'
import { CurlFtpSsl } from './enum/CurlFtpSsl'
import { CurlGlobalInit } from './enum/CurlGlobalInit'
import { CurlGssApi } from './enum/CurlGssApi'
import { CurlHeader } from './enum/CurlHeader'
import { CurlHttpVersion } from './enum/CurlHttpVersion'
import { CurlInfoDebug } from './enum/CurlInfoDebug'
import { CurlIpResolve } from './enum/CurlIpResolve'
import { CurlNetrc } from './enum/CurlNetrc'
import { CurlPause } from './enum/CurlPause'
import { CurlProgressFunc } from './enum/CurlProgressFunc'
import { CurlProtocol } from './enum/CurlProtocol'
import { CurlProxy } from './enum/CurlProxy'
import { CurlRtspRequest } from './enum/CurlRtspRequest'
import { CurlSshAuth } from './enum/CurlSshAuth'
import { CurlSslOpt } from './enum/CurlSslOpt'
import { CurlSslVersion } from './enum/CurlSslVersion'
import { CurlTimeCond } from './enum/CurlTimeCond'
import { CurlUseSsl } from './enum/CurlUseSsl'

const bindings: NodeLibcurlNativeBinding = require('../lib/binding/node_libcurl.node')

// tslint:disable-next-line
const { Curl: _Curl, CurlVersionInfo } = bindings

if (
  !process.env.NODE_LIBCURL_DISABLE_GLOBAL_INIT_CALL ||
  process.env.NODE_LIBCURL_DISABLE_GLOBAL_INIT_CALL !== 'true'
) {
  // We could just pass nothing here, CurlGlobalInitEnum.All is the default anyway.
  const globalInitResult = _Curl.globalInit(CurlGlobalInit.All)
  assert(globalInitResult === 0 || 'Libcurl global init failed.')
}

const decoder = new StringDecoder('utf8')
// Handle used by curl instances created by the Curl wrapper.
const multiHandle = new Multi()
const curlInstanceMap = new WeakMap<EasyNativeBinding, Curl>()

multiHandle.onMessage((error, handle, errorCode) => {
  multiHandle.removeHandle(handle)

  const curlInstance = curlInstanceMap.get(handle)

  assert(
    curlInstance,
    'Could not retrieve curl instance from easy handle on onMessage callback',
  )

  if (error) {
    curlInstance!.onError(error, errorCode)
  } else {
    curlInstance!.onEnd()
  }
})

/**
 * Wrapper around {@link "Easy".Easy | `Easy`} class with a more *nodejs-friendly* interface.
 *
 * This uses an internal {@link "Multi".Multi | `Multi`} instance to asynchronous fire the requests.
 *
 * @public
 */
class Curl extends EventEmitter {
  /**
   * Calls [`curl_global_init()`](http://curl.haxx.se/libcurl/c/curl_global_init.html).
   *
   * For **flags** see the the enum {@link CurlGlobalInit | `CurlGlobalInit`}.
   *
   * This is automatically called when the addon is loaded, to disable this, set the environment variable
   *  `NODE_LIBCURL_DISABLE_GLOBAL_INIT_CALL=false`
   */
  static globalInit = _Curl.globalInit

  /**
   * Calls [`curl_global_cleanup()`](http://curl.haxx.se/libcurl/c/curl_global_cleanup.html)
   *
   * This is automatically called when the process is exiting.
   */
  static globalCleanup = _Curl.globalCleanup

  /**
   * Returns libcurl version string.
   *
   * The string shows which libraries libcurl was built with and their versions, example:
   * ```
   * libcurl/7.69.1-DEV OpenSSL/1.1.1d zlib/1.2.11 WinIDN libssh2/1.9.0_DEV nghttp2/1.40.0
   * ```
   */
  static getVersion = _Curl.getVersion

  /**
   * Returns an object with a representation of the current libcurl version and their features/protocols.
   *
   * This is basically [`curl_version_info()`](https://curl.haxx.se/libcurl/c/curl_version_info.html)
   */
  static getVersionInfo = () => CurlVersionInfo

  /**
   * Returns a string that looks like the one returned by
   * ```bash
   * curl -V
   * ```
   * Example:
   * ```
   * Version: libcurl/7.69.1-DEV OpenSSL/1.1.1d zlib/1.2.11 WinIDN libssh2/1.9.0_DEV nghttp2/1.40.0
   * Protocols: dict, file, ftp, ftps, gopher, http, https, imap, imaps, ldap, ldaps, pop3, pop3s, rtsp, scp, sftp, smb, smbs, smtp, smtps, telnet, tftp
   * Features: AsynchDNS, IDN, IPv6, Largefile, SSPI, Kerberos, SPNEGO, NTLM, SSL, libz, HTTP2, HTTPS-proxy
   * ```
   */
  static getVersionInfoString = () => {
    const version = Curl.getVersion()
    const protocols = CurlVersionInfo.protocols.join(', ')
    const features = CurlVersionInfo.features.join(', ')

    return [
      `Version: ${version}`,
      `Protocols: ${protocols}`,
      `Features: ${features}`,
    ].join('\n')
  }

  /**
   * Useful if you want to check if the current libcurl version is greater or equal than another one.
   * @param x major
   * @param y minor
   * @param z patch
   */
  static isVersionGreaterOrEqualThan = (
    x: number,
    y: number,
    z: number = 0,
  ) => {
    return _Curl.VERSION_NUM >= (x << 16) + (y << 8) + z
  }

  /**
   * This is the default user agent that is going to be used on all `Curl` instances.
   *
   * You can overwrite this in a per instance basis, calling `curlHandle.setOpt('USERAGENT', 'my-user-agent/1.0')`, or
   *  by directly changing this property so it affects all newly created `Curl` instances.
   *
   * To disable this behavior set this property to `null`.
   */
  static defaultUserAgent = `node-libcurl/${pkg.version}`

  /**
   * Returns the number of handles currently open in the internal {@link "Multi".Multi | `Multi`} handle being used.
   */
  static getCount = multiHandle.getCount

  /**
   * Integer representing the current libcurl version.
   *
   * It was built the following way:
   * ```
   * <8 bits major number> | <8 bits minor number> | <8 bits patch number>.
   * ```
   * Version `7.69.1` is therefore returned as `0x074501` / `476417`
   */
  static VERSION_NUM = _Curl.VERSION_NUM

  /**
   * This is a object with members resembling the `CURLINFO_*` libcurl constants.
   *
   * It can be used with {@link "Easy".Easy.getInfo | `Easy#getInfo`} or {@link getInfo | `Curl#getInfo`}.
   *
   * See the official documentation of [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *  for reference.
   *
   * `CURLINFO_EFFECTIVE_URL` becomes `Curl.info.EFFECTIVE_URL`
   */
  static info = _Curl.info

  /**
   * This is a object with members resembling the `CURLOPT_*` libcurl constants.
   *
   * It can be used with {@link "Easy".Easy.setOpt | `Easy#setOpt`} or {@link setOpt | `Curl#setOpt`}.
   *
   * See the official documentation of [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   *  for reference.
   *
   * `CURLOPT_URL` becomes `Curl.option.URL`
   */
  static option = _Curl.option

  /**
   * Internal Easy handle being used
   */
  protected handle: EasyNativeBinding

  /**
   * Stores current response payload.
   *
   * This will not store anything in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected chunks: Buffer[]
  /**
   * Current response length.
   *
   * Will always be zero in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected chunksLength: number

  /**
   * Stores current headers payload.
   *
   * This will not store anything in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected headerChunks: Buffer[]
  /**
   * Current headers length.
   *
   * Will always be zero in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected headerChunksLength: number

  /**
   * Currently enabled features.
   *
   * See {@link enable | `enable`} and {@link disable | `disable`}
   */
  protected features: CurlFeature

  /**
   * Whether this instance is running or not ({@link perform | `perform()`} was called).
   *
   * Make sure to not change their value, otherwise unexpected behavior would happen.
   *
   * @protected
   */
  isRunning: boolean

  /**
   * @param cloneHandle {@link "Easy".Easy | `Easy`} handle that should be used instead of creating a new one.
   */
  constructor(cloneHandle?: EasyNativeBinding) {
    super()

    const handle = cloneHandle || new Easy()

    this.handle = handle

    // callbacks called by libcurl
    handle.setOpt(
      Curl.option.WRITEFUNCTION,
      this.defaultWriteFunction.bind(this),
    )
    handle.setOpt(
      Curl.option.HEADERFUNCTION,
      this.defaultHeaderFunction.bind(this),
    )

    handle.setOpt(Curl.option.USERAGENT, Curl.defaultUserAgent)

    this.chunks = []
    this.chunksLength = 0
    this.headerChunks = []
    this.headerChunksLength = 0

    this.features = 0

    this.isRunning = false

    curlInstanceMap.set(handle, this)
  }

  /**
   * This is the default callback passed to {@link setOpt | `setOpt('WRITEFUNCTION', cb)`}.
   */
  protected defaultWriteFunction(chunk: Buffer, size: number, nmemb: number) {
    if (!(this.features & CurlFeature.NoDataStorage)) {
      this.chunks.push(chunk)
      this.chunksLength += chunk.length
    }

    this.emit('data', chunk, this)

    return size * nmemb
  }

  /**
   * This is the default callback passed to {@link setOpt | `setOpt('HEADERFUNCTION', cb)`}.
   */
  protected defaultHeaderFunction(chunk: Buffer, size: number, nmemb: number) {
    if (!(this.features & CurlFeature.NoHeaderStorage)) {
      this.headerChunks.push(chunk)
      this.headerChunksLength += chunk.length
    }

    this.emit('header', chunk, this)

    return size * nmemb
  }

  /**
   * Callback called when an error is thrown on this handle.
   *
   * This is called from the internal callback we use with the {@link "Multi".Multi.onMessage | `onMessage`}
   *  method of the global {@link "Multi".Multi | `Multi`} handle used by all `Curl` instances.
   */
  onError(error: Error, errorCode: CurlCode) {
    this.isRunning = false

    this.chunks = []
    this.chunksLength = 0
    this.headerChunks = []
    this.headerChunksLength = 0

    this.emit('error', error, errorCode, this)
  }

  /**
   * Callback called when this handle has finished the request.
   *
   * This is called from the internal callback we use with the {@link "Multi".Multi.onMessage | `onMessage`}
   *  method of the global {@link "Multi".Multi | `Multi`} handle used by all `Curl` instances.
   */
  onEnd() {
    const isHeaderStorageEnabled = !(
      this.features & CurlFeature.NoHeaderStorage
    )
    const isDataStorageEnabled = !(this.features & CurlFeature.NoDataStorage)
    const isHeaderParsingEnabled =
      !(this.features & CurlFeature.NoHeaderParsing) && isHeaderStorageEnabled
    const isDataParsingEnabled =
      !(this.features & CurlFeature.NoDataParsing) && isDataStorageEnabled

    this.isRunning = false

    const dataRaw = isDataStorageEnabled
      ? mergeChunks(this.chunks, this.chunksLength)
      : Buffer.alloc(0)
    const headersRaw = isHeaderStorageEnabled
      ? mergeChunks(this.headerChunks, this.headerChunksLength)
      : Buffer.alloc(0)

    this.chunks = []
    this.chunksLength = 0

    this.headerChunks = []
    this.headerChunksLength = 0

    const data = isDataParsingEnabled ? decoder.write(dataRaw) : dataRaw
    const headers = isHeaderParsingEnabled
      ? parseHeaders(decoder.write(headersRaw))
      : headersRaw

    const { code, data: status } = this.handle.getInfo(Curl.info.RESPONSE_CODE)

    if (code !== CurlCode.CURLE_OK) {
      const error = new Error('Could not get status code of request')
      this.emit('error', error, code, this)
    } else {
      this.emit('end', status, data, headers, this)
    }
  }

  /**
   * Enables a feature, must not be used while a request is running.
   *
   * Use {@link CurlFeature | `CurlFeature`} for predefined constants.
   */
  enable(bitmask: CurlFeature) {
    if (this.isRunning) {
      throw new Error(
        'You should not change the features while a request is running.',
      )
    }

    this.features |= bitmask

    return this
  }

  /**
   * Disables a feature, must not be used while a request is running.
   *
   * Use {@link CurlFeature | `CurlFeature`} for predefined constants.
   */
  disable(bitmask: CurlFeature) {
    if (this.isRunning) {
      throw new Error(
        'You should not change the features while a request is running.',
      )
    }

    this.features &= ~bitmask

    return this
  }

  /**
   * Sets an option the handle.
   *
   * This overloaded method has `never` as type for the arguments
   *  because one of the other overloaded signatures must be used.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   *
   * @param optionIdOrName Option name or integer value. Use {@link Curl.option | `Curl.option`} for predefined constants.
   * @param optionValue The value of the option, value type depends on the option being set.
   */
  setOpt(optionIdOrName: never, optionValue: never): this {
    // special case for WRITEFUNCTION and HEADERFUNCTION callbacks
    //  since if they are set back to null, we must restore the default callback.
    let value = optionValue
    if (
      (optionIdOrName === Curl.option.WRITEFUNCTION ||
        optionIdOrName === 'WRITEFUNCTION') &&
      !optionValue
    ) {
      value = this.defaultWriteFunction.bind(this) as never
    } else if (
      (optionIdOrName === Curl.option.HEADERFUNCTION ||
        optionIdOrName === 'HEADERFUNCTION') &&
      !optionValue
    ) {
      value = this.defaultHeaderFunction.bind(this) as never
    }

    const code = this.handle.setOpt(optionIdOrName, value)

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(
        code === CurlCode.CURLE_UNKNOWN_OPTION
          ? 'Unknown option given. First argument must be the option internal id or the option name. You can use the Curl.option constants.'
          : Easy.strError(code),
      )
    }

    return this
  }

  /**
   * Retrieves some information about the last request made by a handle.
   *
   *
   * Official libcurl documentation: [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *
   * @param infoNameOrId Info name or integer value. Use {@link Curl.info | `Curl.info`} for predefined constants.
   */
  getInfo(infoNameOrId: CurlInfoName) {
    const { code, data } = this.handle.getInfo(infoNameOrId)

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(`getInfo failed. Error: ${Easy.strError(code)}`)
    }

    return data
  }

  /**
   * The option `XFERINFOFUNCTION` was introduced in curl version `7.32.0`,
   *  versions older than that should use `PROGRESSFUNCTION`.
   * If you don't want to mess with version numbers you can use this method,
   * instead of directly calling {@link Curl.setOpt | `Curl#setOpt`}.
   *
   * `NOPROGRESS` should be set to false to make this function actually get called.
   */
  setProgressCallback(
    cb:
      | ((
          dltotal: number,
          dlnow: number,
          ultotal: number,
          ulnow: number,
        ) => number)
      | null,
  ) {
    if (Curl.VERSION_NUM >= 0x072000) {
      this.handle.setOpt(Curl.option.XFERINFOFUNCTION, cb)
    } else {
      this.handle.setOpt(Curl.option.PROGRESSFUNCTION, cb)
    }

    return this
  }

  /**
   * Add this instance to the processing queue.
   * This method should be called only one time per request,
   *  otherwise it will throw an error.
   *
   * @remarks
   *
   * This basically calls the {@link "Multi".Multi.addHandle | `Multi#addHandle`} method.
   */
  perform() {
    if (this.isRunning) {
      throw new Error('Handle already running!')
    }

    this.isRunning = true

    multiHandle.addHandle(this.handle)

    return this
  }

  /**
   * Perform any connection upkeep checks.
   *
   *
   * Official libcurl documentation: [`curl_easy_upkeep()`](http://curl.haxx.se/libcurl/c/curl_easy_upkeep.html)
   */
  upkeep() {
    const code = this.handle.upkeep()

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(Easy.strError(code))
    }

    return this
  }

  /**
   * Use this function to pause / unpause a connection.
   *
   * The bitmask argument is a set of bits that sets the new state of the connection.
   *
   * Use {@link CurlPause | `CurlPause`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_pause()`](http://curl.haxx.se/libcurl/c/curl_easy_pause.html)
   */
  pause(bitmask: CurlPause) {
    const code = this.handle.pause(bitmask)

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(Easy.strError(code))
    }

    return this
  }

  /**
   * Reset this handle options to their defaults.
   *
   * This will put the handle in a clean state, as if it was just created.
   *
   *
   * Official libcurl documentation: [`curl_easy_reset()`](http://curl.haxx.se/libcurl/c/curl_easy_reset.html)
   */
  reset() {
    this.removeAllListeners()
    this.handle.reset()

    // add callbacks back as reset will remove them
    this.handle.setOpt(
      Curl.option.WRITEFUNCTION,
      this.defaultWriteFunction.bind(this),
    )
    this.handle.setOpt(
      Curl.option.HEADERFUNCTION,
      this.defaultHeaderFunction.bind(this),
    )

    return this
  }

  /**
   * Duplicate this handle with all their options.
   * Keep in mind that, by default, this also means all event listeners.
   *
   *
   * Official libcurl documentation: [`curl_easy_duphandle()`](http://curl.haxx.se/libcurl/c/curl_easy_duphandle.html)
   *
   * @param shouldCopyEventListeners If you don't want to copy the event listeners, set this to `false`.
   */
  dupHandle(shouldCopyEventListeners: boolean = true) {
    const duplicatedHandle = new Curl(this.handle.dupHandle())
    const eventsToCopy = ['end', 'error', 'data', 'header']

    duplicatedHandle.features = this.features

    if (shouldCopyEventListeners) {
      for (let i = 0; i < eventsToCopy.length; i += 1) {
        const listeners = this.listeners(eventsToCopy[i])

        for (let j = 0; j < listeners.length; j += 1) {
          duplicatedHandle.on(eventsToCopy[i], listeners[j])
        }
      }
    }

    return duplicatedHandle
  }

  /**
   * Close this handle.
   *
   * **NOTE:** After closing the handle, it must not be used anymore. Doing so will throw an error.
   *
   *
   * Official libcurl documentation: [`curl_easy_cleanup()`](http://curl.haxx.se/libcurl/c/curl_easy_cleanup.html)
   */
  close() {
    curlInstanceMap.delete(this.handle)

    this.removeAllListeners()

    if (this.handle.isInsideMultiHandle) {
      multiHandle.removeHandle(this.handle)
    }

    this.handle.setOpt(Curl.option.WRITEFUNCTION, null)
    this.handle.setOpt(Curl.option.HEADERFUNCTION, null)

    this.handle.close()
  }
}

interface Curl {
  on(
    event: 'data',
    listener: (this: Curl, chunk: Buffer, curlInstance: Curl) => void,
  ): this
  on(
    event: 'header',
    listener: (this: Curl, chunk: Buffer, curlInstance: Curl) => void,
  ): this
  on(
    event: 'error',
    listener: (
      this: Curl,
      error: Error,
      errorCode: CurlCode,
      curlInstance: Curl,
    ) => void,
  ): this
  /**
   * The `data` paramater passed to the listener callback will be one of the following:
   *  - Empty `Buffer` if the feature {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag was enabled
   *  - Non-Empty `Buffer` if the feature {@link CurlFeature.NoDataParsing | `NoDataParsing`} flag was enabled
   *  - Otherwise, it will be a string, with the result of decoding the received data as a UTF8 string.
   *      If it's a JSON string for example, you still need to call JSON.parse on it. This library does no extra parsing
   *       whatsoever.
   *
   * The `headers` parameter passed to the listener callback will be one of the following:
   *  - Empty `Buffer` if the feature {@link CurlFeature.NoHeaderParsing | `NoHeaderStorage`} flag was enabled
   *  - Non-Empty `Buffer` if the feature {@link CurlFeature.NoHeaderParsing | `NoHeaderParsing`} flag was enabled
   *  - Otherwise, an array of parsed headers for each request
   *     libcurl made (if there were 2 redirects before the last request, the array will have 3 elements, one for each request)
   */
  on(
    event: 'end',
    listener: (
      this: Curl,
      status: number,
      data: string | Buffer,
      headers: Buffer | HeaderInfo[],
      curlInstance: Curl,
    ) => void,
  ): this
  on(event: string, listener: Function): this

  // START AUTOMATICALLY GENERATED CODE - DO NOT EDIT
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: DataCallbackOptions,
    value:
      | ((
          this: EasyNativeBinding,
          data: Buffer,
          size: number,
          nmemb: number,
        ) => number)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: ProgressCallbackOptions,
    value:
      | ((
          this: EasyNativeBinding,
          dltotal: number,
          dlnow: number,
          ultotal: number,
          ulnow: number,
        ) => number | CurlProgressFunc)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: StringListOptions, value: string[] | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'CHUNK_BGN_FUNCTION',
    value:
      | ((
          this: EasyNativeBinding,
          fileInfo: FileInfo,
          remains: number,
        ) => CurlChunk)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'CHUNK_END_FUNCTION',
    value: ((this: EasyNativeBinding) => CurlChunk) | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'DEBUGFUNCTION',
    value:
      | ((this: EasyNativeBinding, type: CurlInfoDebug, data: Buffer) => 0)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'FNMATCH_FUNCTION',
    value:
      | ((
          this: EasyNativeBinding,
          pattern: string,
          value: string,
        ) => CurlFnMatchFunc)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'SEEKFUNCTION',
    value:
      | ((this: EasyNativeBinding, offset: number, origin: number) => number)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'TRAILERFUNCTION',
    value: ((this: EasyNativeBinding) => string[] | false) | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SHARE', value: Share | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HTTPPOST', value: HttpPostField[] | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'FTP_SSL_CCC', value: CurlFtpSsl | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'FTP_FILEMETHOD', value: CurlFtpMethod | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'GSSAPI_DELEGATION', value: CurlGssApi | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HEADEROPT', value: CurlHeader | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HTTP_VERSION', value: CurlHttpVersion | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'IPRESOLVE', value: CurlIpResolve | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'NETRC', value: CurlNetrc | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROTOCOLS', value: CurlProtocol | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROXY_SSL_OPTIONS', value: CurlSslOpt | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROXYTYPE', value: CurlProxy | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'REDIR_PROTOCOLS', value: CurlProtocol | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'RTSP_REQUEST', value: CurlRtspRequest | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSH_AUTH_TYPES', value: CurlSshAuth | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSL_OPTIONS', value: CurlSslOpt | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSLVERSION', value: CurlSslVersion | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'TIMECONDITION', value: CurlTimeCond | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'USE_SSL', value: CurlUseSsl | null): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: Exclude<CurlOptionName, SpecificOptions>,
    value: string | number | boolean | null,
  ): this
  // END AUTOMATICALLY GENERATED CODE - DO NOT EDIT
}

export { Curl }
