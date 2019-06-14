/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import path from 'path'
import { EventEmitter } from 'events'
import { StringDecoder } from 'string_decoder'
import assert from 'assert'

const pkg = require('../package.json')

// tslint:disable-next-line
import binary from 'node-pre-gyp'

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

import { CurlCode } from './enum/CurlCode'
import { CurlFeature } from './enum/CurlFeature'
import { CurlGlobalInit } from './enum/CurlGlobalInit'
import { CurlGssApi } from './enum/CurlGssApi'
import { CurlPause } from './enum/CurlPause'
import { CurlSslOpt } from './enum/CurlSslOpt'

const bindingPath = binary.find(
  path.resolve(path.join(__dirname, './../package.json')),
)

const bindings: NodeLibcurlNativeBinding = require(bindingPath)

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
 * Wrapper around {@link Easy} class with a more *nodejs-friendly* interface.
 *
 * @remarks
 *
 * Also see the Curl Interface definition for some overloaded methods.
 * The `setOpt` method here has `(never, never)` as type for their arguments because
 *  the overloaded methods are the ones with the correct signatures.
 *
 * @public
 */
class Curl extends EventEmitter {
  /**
   * Calls [curl_global_init()](http://curl.haxx.se/libcurl/c/curl_global_init.html)
   * For **flags** see the the enum `CurlGlobalInit`
   *
   * This is automatically called when the addon is loaded, to disable this, set the environment variable
   *  `NODE_LIBCURL_DISABLE_GLOBAL_INIT_CALL=false`
   */
  static globalInit = _Curl.globalInit

  /**
   * Calls [curl_global_cleanup()](http://curl.haxx.se/libcurl/c/curl_global_cleanup.html)
   *
   * This is automatically called when the process is exiting
   */
  static globalCleanup = _Curl.globalCleanup

  /**
   * Returns libcurl version string.
   * The string shows which features are enabled,
   *  and the version of the libraries that libcurl was built with.
   */
  static getVersion = _Curl.getVersion

  /**
   * Returns an object with a representation of the current libcurl version and their features/protocols.
   *
   * This is basically [curl_version_info()](https://curl.haxx.se/libcurl/c/curl_version_info.html)
   */
  static getVersionInfo = () => CurlVersionInfo

  /**
   * Returns a string that looks like the one returned by
   * ```
   * curl -V
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

  static isVersionGreaterOrEqualThan = (
    x: number,
    y: number,
    z: number = 0,
  ) => {
    return _Curl.VERSION_NUM >= (x << 16) + (y << 8) + z
  }

  static defaultUserAgent = `node-libcurl/${pkg.version}`

  /**
   * Returns the number of handles currently open in the internal multi handle being used.
   */
  static getCount = multiHandle.getCount

  /**
   * Current libcurl version
   */
  static VERSION_NUM = _Curl.VERSION_NUM

  /**
   * Options to be used with `Easy.getInfo` or `Curl.getInfo`
   *
   * See the official documentation of [curl_easy_getinfo()](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *  for reference.
   *
   * `CURLINFO_EFFECTIVE_URL` becomes `Curl.info.EFFECTIVE_URL`
   */
  static info = _Curl.info
  /**
   * Options to be used with `Easy.setOpt` or `Curl.setOpt`
   *
   * See the official documentation of [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
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
   * Stores current response payload
   * This will not store anything in case the NO_DATA_STORAGE flag is enabled
   */
  protected chunks: Buffer[]
  protected chunksLength: number

  /**
   * Stores current headers payload
   * This will not store anything in case the NO_DATA_STORAGE flag is enabled
   */
  protected headerChunks: Buffer[]
  protected headerChunksLength: number

  protected features: CurlFeature

  /**
   * Whether this instance is running or not (called perform())
   */
  isRunning: boolean

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

  protected defaultWriteFunction(chunk: Buffer, size: number, nmemb: number) {
    if (!(this.features & CurlFeature.NoDataStorage)) {
      this.chunks.push(chunk)
      this.chunksLength += chunk.length
    }

    this.emit('data', chunk, this)

    return size * nmemb
  }

  protected defaultHeaderFunction(chunk: Buffer, size: number, nmemb: number) {
    if (!(this.features & CurlFeature.NoHeaderStorage)) {
      this.headerChunks.push(chunk)
      this.headerChunksLength += chunk.length
    }

    this.emit('header', chunk, this)

    return size * nmemb
  }

  /**
   * Event called when an error is thrown on this handle.
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
   * Called when this handle has finished the request.
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
   * Enables a feature, should not be used while a request is running.
   * Use `Curl.feature` for predefined constants.
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
   * Disables a feature, should not be used while a request is running.
   * Use `Curl.feature` for predefined constants.
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

  setOpt(optionIdOrName: never, optionValue: never): this {
    // we are using never as arguments here, because we want to make sure the client
    //  uses one of the overloaded types

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
   * Use `Curl.info` for predefined constants.
   * Official libcurl documentation: [curl_easy_getinfo()](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   */
  getInfo(infoNameOrId: CurlInfoName) {
    const { code, data } = this.handle.getInfo(infoNameOrId)

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(`getInfo failed. Error: ${Easy.strError(code)}`)
    }

    return data
  }

  /**
   * The option XFERINFOFUNCTION was introduced in curl version 7.32.0,
   *  versions older than that should use PROGRESSFUNCTION.
   * If you don't want to mess with version numbers you can use this method,
   * instead of directly calling `Curl.setOpt`
   *
   * NOPROGRESS should be set to false to make this function actually get called.
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
   *  otherwise it will throw an exception.
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
   */
  upkeep() {
    const code = this.handle.upkeep()

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(Easy.strError(code))
    }

    return this
  }

  /**
   * Using this function, you can explicitly mark a running connection to get paused, and you can unpause a connection that was previously paused.
   *
   * The bitmask argument is a set of bits that sets the new state of the connection.
   *
   * Use `Curl.pause` for predefined constants.
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
   * Use the argument to change that behaviour.
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
   * **NOTE:** After closing the handle, it should not be used anymore! Doing so will throw an exception.
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

/**
 * Overloaded methods for the Curl class.
 */
interface Curl {
  on(event: 'data', listener: (chunk: Buffer, curlInstance: Curl) => void): this
  on(
    event: 'header',
    listener: (chunk: Buffer, curlInstance: Curl) => void,
  ): this
  on(
    event: 'error',
    listener: (error: Error, errorCode: CurlCode, curlInstance: Curl) => void,
  ): this
  on(
    event: 'end',
    listener: (
      status: number,
      data: string | Buffer,
      headers: Buffer | HeaderInfo[],
      curlInstance: Curl,
    ) => void,
  ): this
  on(event: string, listener: Function): this

  // START AUTOMATICALLY GENERATED CODE - DO NOT EDIT
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: DataCallbackOptions,
    value: ((data: Buffer, size: number, nmemb: number) => number) | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: ProgressCallbackOptions,
    value:
      | ((
          dltotal: number,
          dlnow: number,
          ultotal: number,
          ulnow: number,
        ) => number)
      | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: StringListOptions, value: string[] | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'CHUNK_BGN_FUNCTION',
    value: ((fileInfo: FileInfo, remains: number) => number) | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'CHUNK_END_FUNCTION', value: (() => number) | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'DEBUGFUNCTION',
    value: ((type: number, data: Buffer) => void) | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'FNMATCH_FUNCTION',
    value: ((pattern: string, value: string) => number) | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'SEEKFUNCTION',
    value: ((offset: number, origin: number) => number) | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'TRAILERFUNCTION',
    value: (() => string[] | false) | null,
  ): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SHARE', value: Share | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HTTPPOST', value: HttpPostField[] | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'GSSAPI_DELEGATION', value: CurlGssApi | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROXY_SSL_OPTIONS', value: CurlSslOpt | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSL_OPTIONS', value: CurlSslOpt | null): this
  /**
   * Use `Curl.option` for predefined constants.
   *
   * Official libcurl documentation: [curl_easy_setopt()](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: Exclude<CurlOptionName, SpecificOptions>,
    value: string | number | boolean | null,
  ): this
  // END AUTOMATICALLY GENERATED CODE - DO NOT EDIT
}

export { Curl }
