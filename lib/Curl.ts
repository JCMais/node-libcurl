/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { EventEmitter } from 'events'
import { StringDecoder } from 'string_decoder'
import assert from 'assert'
import { Readable } from 'stream'

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  BlobOptions,
  CurlOptionName,
  SpecificOptions,
  CurlOptionValueType,
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
import {
  CurlHsts,
  CurlHstsCacheEntry,
  CurlHstsCacheCount,
} from './enum/CurlHsts'
import { CurlHttpVersion } from './enum/CurlHttpVersion'
import { CurlInfoDebug } from './enum/CurlInfoDebug'
import { CurlIpResolve } from './enum/CurlIpResolve'
import { CurlNetrc } from './enum/CurlNetrc'
import { CurlPause } from './enum/CurlPause'
import { CurlPreReqFunc } from './enum/CurlPreReqFunc'
import { CurlProgressFunc } from './enum/CurlProgressFunc'
import { CurlProtocol } from './enum/CurlProtocol'
import { CurlProxy } from './enum/CurlProxy'
import { CurlRtspRequest } from './enum/CurlRtspRequest'
import { CurlSshAuth } from './enum/CurlSshAuth'
import { CurlSslOpt } from './enum/CurlSslOpt'
import { CurlSslVersion } from './enum/CurlSslVersion'
import { CurlTimeCond } from './enum/CurlTimeCond'
import { CurlUseSsl } from './enum/CurlUseSsl'
import { CurlWriteFunc } from './enum/CurlWriteFunc'
import { CurlReadFunc } from './enum/CurlReadFunc'
import { CurlInfoNameSpecific, GetInfoReturn } from './types/EasyNativeBinding'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bindings: NodeLibcurlNativeBinding = require('../lib/binding/node_libcurl.node')

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
 * This uses an internal {@link "Multi".Multi | `Multi`} instance allowing for asynchronous
 * requests.
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
   * This is the default user agent that is going to be used on all `Curl` instances.
   *
   * You can overwrite this in a per instance basis, calling `curlHandle.setOpt('USERAGENT', 'my-user-agent/1.0')`, or
   *  by directly changing this property so it affects all newly created `Curl` instances.
   *
   * To disable this behavior set this property to `null`.
   */
  static defaultUserAgent = `node-libcurl/${pkg.version}`

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
   * Returns the number of handles currently open in the internal {@link "Multi".Multi | `Multi`} handle being used.
   */
  static getCount = multiHandle.getCount

  /**
   * Whether this instance is running or not ({@link perform | `perform()`} was called).
   *
   * Make sure to not change their value, otherwise unexpected behavior would happen.
   *
   * This is marked as protected only with the TSDoc to not cause a breaking change.
   *
   * @protected
   */
  isRunning = false

  /**
   * Whether this instance is closed or not ({@link close | `close()`} was called).
   *
   * Make sure to not change their value, otherwise unexpected behavior would happen.
   */
  get isOpen() {
    return this.handle.isOpen
  }

  /**
   * Internal Easy handle being used
   */
  protected handle: EasyNativeBinding

  /**
   * Stores current response payload.
   *
   * This will not store anything in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected chunks: Buffer[] = []
  /**
   * Current response length.
   *
   * Will always be zero in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected chunksLength = 0

  /**
   * Stores current headers payload.
   *
   * This will not store anything in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected headerChunks: Buffer[] = []
  /**
   * Current headers length.
   *
   * Will always be zero in case {@link CurlFeature.NoDataStorage | `NoDataStorage`} flag is enabled
   */
  protected headerChunksLength = 0

  /**
   * Currently enabled features.
   *
   * See {@link enable | `enable`} and {@link disable | `disable`}
   */
  protected features: CurlFeature = CurlFeature.Empty

  // these are for stream handling
  // the streams themselves
  protected writeFunctionStream: Readable | null = null
  protected readFunctionStream: Readable | null = null

  // READFUNCTION / upload related
  protected streamReadFunctionCallbacksToClean: Array<
    [Readable, string, (...args: any[]) => void]
  > = []
  // a state machine would be better here than all these flags 🤣
  protected streamReadFunctionShouldEnd = false
  protected streamReadFunctionShouldPause = false
  protected streamReadFunctionPaused = false
  // WRITEFUNCTION / download related
  protected streamWriteFunctionHighWaterMark: number | undefined
  protected streamWriteFunctionShouldPause = false
  protected streamWriteFunctionPaused = false
  protected streamWriteFunctionFirstRun = true
  // common
  protected streamPauseNext = false
  protected streamContinueNext = false
  protected streamError: false | Error = false
  protected streamUserSuppliedProgressFunction: CurlOptionValueType['xferInfoFunction'] =
    null

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

    curlInstanceMap.set(handle, this)
  }

  /**
   * Callback called when an error is thrown on this handle.
   *
   * This is called from the internal callback we use with the {@link "Multi".Multi.onMessage | `onMessage`}
   *  method of the global {@link "Multi".Multi | `Multi`} handle used by all `Curl` instances.
   *
   * @protected
   */
  onError(error: Error, errorCode: CurlCode) {
    this.resetInternalState()

    this.emit('error', error, errorCode, this)
  }

  /**
   * Callback called when this handle has finished the request.
   *
   * This is called from the internal callback we use with the {@link "Multi".Multi.onMessage | `onMessage`}
   *  method of the global {@link "Multi".Multi | `Multi`} handle used by all `Curl` instances.
   *
   * This should not be called in any other way.
   *
   * @protected
   */
  onEnd() {
    const isStreamResponse = !!(this.features & CurlFeature.StreamResponse)
    const isDataStorageEnabled =
      !isStreamResponse && !(this.features & CurlFeature.NoDataStorage)
    const isDataParsingEnabled =
      !isStreamResponse &&
      !(this.features & CurlFeature.NoDataParsing) &&
      isDataStorageEnabled

    const dataRaw = isDataStorageEnabled
      ? mergeChunks(this.chunks, this.chunksLength)
      : Buffer.alloc(0)

    const data = isDataParsingEnabled ? decoder.write(dataRaw) : dataRaw
    const headers = this.getHeaders()

    const { code, data: status } = this.handle.getInfo(Curl.info.RESPONSE_CODE)

    // if this had the stream response flag we need to signal the end of the stream by pushing null to it.
    if (isStreamResponse) {
      // if the writeFunctionStream is still null here, this means the response had no body
      // This may happen because the writeFunctionStream is created in the writeFunction callback, which is not called
      // for requests that do not have a body
      if (!this.writeFunctionStream) {
        // we such cases we must call the on Stream event and immediately signal the end of the stream.
        const noopStream = new Readable({
          read() {
            setImmediate(() => {
              this.push(null)
            })
          },
        })

        // we are calling this with nextTick because it must run before the next event loop iteration (notice that the cleanup is called with setImmediate below).
        // We are not just calling it directly to avoid errors in the on Stream callbacks causing this function to throw
        process.nextTick(() =>
          this.emit('stream', noopStream, status, headers, this),
        )
      } else {
        this.writeFunctionStream.push(null)
      }
    }

    const wrapper = isStreamResponse
      ? setImmediate
      : (fn: (...args: any[]) => void) => fn()

    wrapper(() => {
      this.resetInternalState()

      // if is ignored because this should never happen under normal circumstances.
      /* istanbul ignore if */
      if (code !== CurlCode.CURLE_OK) {
        const error = new Error('Could not get status code of request')
        this.emit('error', error, code, this)
      } else {
        this.emit('end', status, data, headers, this)
      }
    })
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
   * This overloaded method has `never` as type for the argument
   *  because one of the other overloaded signatures must be used.
   *
   * Official libcurl documentation: [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *
   * @param infoNameOrId Info name or integer value. Use {@link Curl.info | `Curl.info`} for predefined constants.
   */
  getInfo(infoNameOrId: never): any {
    const { code, data } = this.handle.getInfo(infoNameOrId)

    if (code !== CurlCode.CURLE_OK) {
      throw new Error(`getInfo failed. Error: ${Easy.strError(code)}`)
    }

    return data
  }

  /**
   * This will set an internal `READFUNCTION` callback that will read all the data from this stream.
   *
   * One usage for that is to upload data directly from streams. Example:
   *
   * ```typescript
   *  const curl = new Curl()
   *  curl.setOpt('URL', 'https://some-domain/upload')
   *  curl.setOpt('UPLOAD', true)
   *  // so we do not need to set the content length
   *  curl.setOpt('HTTPHEADER', ['Transfer-Encoding: chunked'])
   *
   *  const filePath = './test.zip'
   *  const stream = fs.createReadStream(filePath)
   *  curl.setUploadStream(stream)
   *
   *  curl.setStreamProgressCallback(() => {
   *    // this will use the default progress callback from libcurl
   *    return CurlProgressFunc.Continue
   *  })
   *
   *  curl.on('end', (statusCode, data) => {
   *    console.log('\n'.repeat(5))
   *    // data length should be 0, as it was sent using the response stream
   *    console.log(
   *      `curl - end - status: ${statusCode} - data length: ${data.length}`,
   *    )
   *    curl.close()
   *  })
   *  curl.on('error', (error, errorCode) => {
   *    console.log('\n'.repeat(5))
   *    console.error('curl - error: ', error, errorCode)
   *    curl.close()
   *  })
   *  curl.perform()
   * ```
   *
   * Multiple calls with the same stream that was previously set has no effect.
   *
   * Setting this to `null` will remove the `READFUNCTION` callback and disable this behavior.
   *
   * @remarks
   *
   * This option is reset after each request, so if you want to upload the same data again using the same
   * `Curl` instance, you will need to provide a new stream.
   *
   * Make sure your libcurl version is greater than or equal 7.69.1.
   * Versions older than that one are not reliable for streams usage.
   */
  setUploadStream(stream: Readable | null) {
    if (!stream) {
      if (this.readFunctionStream) {
        this.cleanupReadFunctionStreamEvents()
        this.readFunctionStream = null
        this.setOpt('READFUNCTION', null)
      }
      return this
    }

    if (this.readFunctionStream === stream) return this

    if (
      typeof stream?.on !== 'function' ||
      typeof stream?.read !== 'function'
    ) {
      throw new Error(
        'The passed value to setUploadStream does not looks like a stream object',
      )
    }

    this.readFunctionStream = stream

    const resumeIfPaused = () => {
      if (this.streamReadFunctionPaused) {
        this.streamReadFunctionPaused = false

        // let's unpause only on the next event loop iteration
        // this will avoid scenarios where the readable event was emitted
        // between libcurl pausing the transfer from the READFUNCTION
        // and the next real iteration.
        setImmediate(() => {
          // just to make sure we do not try to unpause
          // a connection that has already finished
          // this can happen if some error has been throw
          // in the meantime
          if (this.isRunning) {
            this.pause(CurlPause.Cont)
          }
        })
      }
    }

    const attachEventListenerToStream = (
      event: string,
      cb: (...args: any[]) => void,
    ) => {
      this.readFunctionStream!.on(event, cb)
      this.streamReadFunctionCallbacksToClean.push([
        this.readFunctionStream!,
        event,
        cb,
      ])
    }

    // TODO: Handle adding the event multiple times?
    // can only happen if the user calls the method with the same stream more than one time
    // and due to the if at the top, this is only possible if they use another stream in-between.

    attachEventListenerToStream('readable', () => {
      resumeIfPaused()
    })

    // This needs the same logic than the destroy callback for the response stream
    // inside the default WRITEFUNCTION.
    // Which basically means we cannot throw an error inside the READFUNCTION itself
    // as this would cause the pause itself to throw an error
    // (pause calls the READFUNCTION before returning)
    // So we must create a fake "pause" just to trigger the progress function, and
    // then the error will be thrown.
    // This is why the following two callbacks are setting
    // this.streamReadFunctionShouldPause = true
    attachEventListenerToStream('close', () => {
      // If the stream was closed, but end was not called
      // it means the stream was forcefully destroyed, so
      // we must let libcurl fail!
      // streamError could already be set if destroy was called with an error
      // as it would call the error callback below, so we don't need to do anything.
      if (!this.streamReadFunctionShouldEnd && !this.streamError) {
        this.streamError = new Error(
          'Curl upload stream was unexpectedly destroyed',
        )

        this.streamReadFunctionShouldPause = true
        resumeIfPaused()
      }
    })
    attachEventListenerToStream('error', (error: Error) => {
      this.streamError = error

      this.streamReadFunctionShouldPause = true
      resumeIfPaused()
    })

    attachEventListenerToStream('end', () => {
      this.streamReadFunctionShouldEnd = true

      resumeIfPaused()
    })

    this.setOpt('READFUNCTION', (buffer, size, nmemb) => {
      // Remember, we cannot throw this.streamError here.

      if (this.streamReadFunctionShouldPause) {
        this.streamReadFunctionShouldPause = false
        this.streamReadFunctionPaused = true
        return CurlReadFunc.Pause
      }

      const amountToRead = size * nmemb

      const data = stream.read(amountToRead)

      if (!data) {
        if (this.streamReadFunctionShouldEnd) {
          return 0
        } else {
          this.streamReadFunctionPaused = true
          return CurlReadFunc.Pause
        }
      }

      const totalWritten = data.copy(buffer)

      // we could also return CurlReadFunc.Abort or CurlReadFunc.Pause here.
      return totalWritten
    })

    return this
  }

  /**
   * Set the param to `null` to use the Node.js default value.
   *
   * @param highWaterMark This will passed directly to the `Readable` stream created to be returned as the response'
   *
   * @remarks
   * Only useful when the {@link CurlFeature.StreamResponse | `StreamResponse`} feature flag is enabled.
   */
  setStreamResponseHighWaterMark(highWaterMark: number | null) {
    this.streamWriteFunctionHighWaterMark = highWaterMark || undefined
    return this
  }

  /**
   * This sets the callback to be used as the progress function when using any of the stream features.
   *
   * This is needed because when this `Curl` instance is enabled to use streams for upload/download, it needs
   * to set the libcurl progress function option to an internal function.
   *
   * If you are using any of the streams features, do not overwrite the progress callback to something else,
   * be it using {@link setOpt | `setOpt`} or {@link setProgressCallback | `setProgressCallback`}, as this would
   * cause undefined behavior.
   *
   * If are using this callback, there is no need to set the `NOPROGRESS` option to false (as you normally would).
   */
  setStreamProgressCallback(cb: CurlOptionValueType['xferInfoFunction']) {
    this.streamUserSuppliedProgressFunction = cb

    return this
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

    // set progress function to our internal one if using stream upload/download
    const isStreamEnabled =
      this.features & CurlFeature.StreamResponse || this.readFunctionStream
    if (isStreamEnabled) {
      this.setProgressCallback(this.streamModeProgressFunction.bind(this))
      this.setOpt('NOPROGRESS', false)
    }

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
  dupHandle(shouldCopyEventListeners = true) {
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
    // TODO(jonathan): on next semver major check if this.handle.isOpen is false and if it is, return immediately.
    curlInstanceMap.delete(this.handle)

    this.removeAllListeners()

    if (this.handle.isInsideMultiHandle) {
      multiHandle.removeHandle(this.handle)
    }

    this.handle.setOpt(Curl.option.WRITEFUNCTION, null)
    this.handle.setOpt(Curl.option.HEADERFUNCTION, null)

    this.handle.close()
  }

  /**
   * This is used to reset a few properties to their pre-request state.
   */
  protected resetInternalState() {
    this.isRunning = false

    this.chunks = []
    this.chunksLength = 0
    this.headerChunks = []
    this.headerChunksLength = 0

    const wasStreamEnabled = this.writeFunctionStream || this.readFunctionStream

    if (wasStreamEnabled) {
      this.setProgressCallback(null)
    }

    // reset back the READFUNCTION if there was a stream we were reading from
    if (this.readFunctionStream) {
      this.setOpt('READFUNCTION', null)
    }

    // these are mostly streams related, as these options are not persisted between requests
    // the streams themselves
    this.writeFunctionStream = null
    this.readFunctionStream = null
    // READFUNCTION / upload related
    this.streamReadFunctionShouldEnd = false
    this.streamReadFunctionShouldPause = false
    this.streamReadFunctionPaused = false
    // WRITEFUNCTION / download related
    this.streamWriteFunctionShouldPause = false
    this.streamWriteFunctionPaused = false
    this.streamWriteFunctionFirstRun = true
    // common
    this.streamPauseNext = false
    this.streamContinueNext = false
    this.streamError = false
    this.streamUserSuppliedProgressFunction = null

    this.cleanupReadFunctionStreamEvents()
  }

  /**
   * When uploading a stream (by calling {@link setUploadStream | `setUploadStream`})
   * some event listeners are attached to the stream instance.
   * This will remove them so our callbacks are not called anymore.
   */
  protected cleanupReadFunctionStreamEvents() {
    this.streamReadFunctionCallbacksToClean.forEach(([stream, event, cb]) => {
      stream.off(event, cb)
    })
    this.streamReadFunctionCallbacksToClean = []
  }

  /**
   * Returns headers from the current stored chunks - if any
   */
  protected getHeaders() {
    const isHeaderStorageEnabled = !(
      this.features & CurlFeature.NoHeaderStorage
    )
    const isHeaderParsingEnabled =
      !(this.features & CurlFeature.NoHeaderParsing) && isHeaderStorageEnabled

    const headersRaw = isHeaderStorageEnabled
      ? mergeChunks(this.headerChunks, this.headerChunksLength)
      : Buffer.alloc(0)

    return isHeaderParsingEnabled
      ? parseHeaders(decoder.write(headersRaw))
      : headersRaw
  }

  /**
   * The internal function passed to `PROGRESSFUNCTION` (`XFERINFOFUNCTION` on most recent libcurl versions)
   * when using any of the stream features.
   */
  protected streamModeProgressFunction(
    dltotal: number,
    dlnow: number,
    ultotal: number,
    ulnow: number,
  ) {
    if (this.streamError) throw this.streamError

    const ret = this.streamUserSuppliedProgressFunction
      ? this.streamUserSuppliedProgressFunction.call(
          this.handle,
          dltotal,
          dlnow,
          ultotal,
          ulnow,
        )
      : 0

    return ret
  }

  /**
   * This is the default callback passed to {@link setOpt | `setOpt('WRITEFUNCTION', cb)`}.
   */
  protected defaultWriteFunction(chunk: Buffer, size: number, nmemb: number) {
    // this is a stream based request, so we need a totally different handling
    if (this.features & CurlFeature.StreamResponse) {
      return this.defaultWriteFunctionStreamBased(chunk, size, nmemb)
    }

    if (!(this.features & CurlFeature.NoDataStorage)) {
      this.chunks.push(chunk)
      this.chunksLength += chunk.length
    }

    this.emit('data', chunk, this)

    return size * nmemb
  }

  /**
   * This is used by the default callback passed to {@link setOpt | `setOpt('WRITEFUNCTION', cb)`}
   * when the feature to stream response is enabled.
   */
  protected defaultWriteFunctionStreamBased(
    chunk: Buffer,
    size: number,
    nmemb: number,
  ) {
    if (!this.writeFunctionStream) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const handle = this
      // create the response stream we are going to use
      this.writeFunctionStream = new Readable({
        highWaterMark: this.streamWriteFunctionHighWaterMark,
        destroy(error, cb) {
          handle.streamError =
            error ||
            new Error('Curl response stream was unexpectedly destroyed')

          // let the event loop run one more time before we do anything
          // if the handle is not running anymore it means that the
          // error we set above was caught, if it is still running, then it means that:
          // - the handle is paused
          // - the progress function was not called yet
          // If this is the case, then we just unpause the handle. This will cause the following:
          // - the WRITEFUNCTION callback will be called
          // - this will pause the handle again (because we cannot throw the error in here)
          // - the PROGRESSFUNCTION callback will be called, and then the error will be thrown.
          setImmediate(() => {
            if (handle.isRunning && handle.streamWriteFunctionPaused) {
              handle.streamWriteFunctionPaused = false
              handle.streamWriteFunctionShouldPause = true
              try {
                handle.pause(CurlPause.RecvCont)
              } catch (error) {
                cb(error as Error)
                return
              }
            }

            cb(null)
          })
        },
        read(_size) {
          if (
            handle.streamWriteFunctionFirstRun ||
            handle.streamWriteFunctionPaused
          ) {
            if (handle.streamWriteFunctionFirstRun) {
              handle.streamWriteFunctionFirstRun = false
            }
            // we must allow Node.js to process the whole event queue
            // before we unpause
            setImmediate(() => {
              if (handle.isRunning) {
                handle.streamWriteFunctionPaused = false
                handle.pause(CurlPause.RecvCont)
              }
            })
          }
        },
      })

      // as soon as we have the stream, we need to emit the "stream" event
      // but the "stream" event needs the statusCode and the headers, so this
      // is what we are retrieving here.
      const headers = this.getHeaders()

      const { code, data: status } = this.handle.getInfo(
        Curl.info.RESPONSE_CODE,
      )

      if (code !== CurlCode.CURLE_OK) {
        const error = new Error('Could not get status code of request')
        this.emit('error', error, code, this)
        return 0
      }

      // let's emit the event only in the next iteration of the event loop
      // We need to do this otherwise the event listener callbacks would run
      // before the pause below, and this is probably not what we want.
      setImmediate(() =>
        this.emit('stream', this.writeFunctionStream, status, headers, this),
      )

      this.streamWriteFunctionPaused = true
      return CurlWriteFunc.Pause
    }

    // pause this req
    if (this.streamWriteFunctionShouldPause) {
      this.streamWriteFunctionShouldPause = false
      this.streamWriteFunctionPaused = true
      return CurlWriteFunc.Pause
    }

    // write to the stream
    const ok = this.writeFunctionStream.push(chunk)

    // pause connection until there is more data
    if (!ok) {
      this.streamWriteFunctionPaused = true
      this.pause(CurlPause.Recv)
    }

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
  static isVersionGreaterOrEqualThan = (x: number, y: number, z = 0) => {
    return _Curl.VERSION_NUM >= (x << 16) + (y << 8) + z
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
   * This is emitted if the StreamResponse feature was enabled.
   */
  on(
    event: 'stream',
    listener: (
      this: Curl,
      stream: Readable,
      status: number,
      headers: Buffer | HeaderInfo[],
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
  // eslint-disable-next-line @typescript-eslint/ban-types
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
  setOpt(option: BlobOptions, value: ArrayBuffer | Buffer | string | null): this
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
   * You can either return a single `CurlHstsReadCallbackResult` object or an array of `CurlHstsReadCallbackResult` objects.
   * If returning an array, the callback will only be called once per request.
   * If returning a single object, the callback will be called multiple times until `null` is returned.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'HSTSREADFUNCTION',
    value:
      | ((
          this: EasyNativeBinding,
        ) => null | CurlHstsCacheEntry | CurlHstsCacheEntry[])
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'HSTSWRITEFUNCTION',
    value:
      | ((
          this: EasyNativeBinding,
          cacheEntry: CurlHstsCacheEntry,
          cacheCount: CurlHstsCacheCount,
        ) => any)
      | null,
  ): this
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'PREREQFUNCTION',
    value:
      | ((
          this: EasyNativeBinding,
          connPrimaryIp: string,
          connLocalIp: string,
          connPrimaryPort: number,
          conLocalPort: number,
        ) => CurlPreReqFunc)
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
  setOpt(option: 'HSTS_CTRL', value: CurlHsts | null): this
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

  // overloaded getInfo definitions - changes made here must also be made in EasyNativeBinding.ts
  // TODO: do this automatically, like above.

  /**
   * Returns information about the finished connection.
   *
   * Official libcurl documentation: [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *
   * @param info Info to retrieve. Use {@link "Curl".Curl.info | `Curl.info`} for predefined constants.
   */
  getInfo(info: 'CERTINFO'): GetInfoReturn<string[]>['data']

  /**
   * Returns information about the finished connection.
   *
   * Official libcurl documentation: [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *
   * @param info Info to retrieve. Use {@link "Curl".Curl.info | `Curl.info`} for predefined constants.
   */
  getInfo(
    info: Exclude<CurlInfoName, CurlInfoNameSpecific>,
  ): GetInfoReturn['data']
}

export { Curl }
