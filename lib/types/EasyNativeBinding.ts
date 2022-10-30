/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Share } from '../Share'
import {
  CurlOptionName,
  DataCallbackOptions,
  ProgressCallbackOptions,
  BlobOptions,
  StringListOptions,
  SpecificOptions,
} from '../generated/CurlOption'
import { CurlInfoName } from '../generated/CurlInfo'

import { CurlChunk } from '../enum/CurlChunk'
import { CurlCode } from '../enum/CurlCode'
import { CurlFnMatchFunc } from '../enum/CurlFnMatchFunc'
import { CurlFtpMethod } from '../enum/CurlFtpMethod'
import { CurlFtpSsl } from '../enum/CurlFtpSsl'
import { CurlGssApi } from '../enum/CurlGssApi'
import { CurlHeader } from '../enum/CurlHeader'
import {
  CurlHsts,
  CurlHstsCacheEntry,
  CurlHstsCacheCount,
} from '../enum/CurlHsts'
import { CurlHttpVersion } from '../enum/CurlHttpVersion'
import { CurlInfoDebug } from '../enum/CurlInfoDebug'
import { CurlIpResolve } from '../enum/CurlIpResolve'
import { CurlNetrc } from '../enum/CurlNetrc'
import { CurlPause } from '../enum/CurlPause'
import { CurlPreReqFunc } from '../enum/CurlPreReqFunc'
import { CurlProgressFunc } from '../enum/CurlProgressFunc'
import { CurlProtocol } from '../enum/CurlProtocol'
import { CurlProxy } from '../enum/CurlProxy'
import { CurlRtspRequest } from '../enum/CurlRtspRequest'
import { CurlSshAuth } from '../enum/CurlSshAuth'
import { CurlSslOpt } from '../enum/CurlSslOpt'
import { CurlSslVersion } from '../enum/CurlSslVersion'
import { CurlTimeCond } from '../enum/CurlTimeCond'
import { CurlUseSsl } from '../enum/CurlUseSsl'
import { SocketState } from '../enum/SocketState'

import { FileInfo, HttpPostField } from './'

export interface GetInfoReturn<DataType extends any = number | string | null> {
  data: DataType
  code: CurlCode
}

export type CurlInfoNameSpecific = 'CERTINFO'

/**
 * `Easy` class that acts as an wrapper around the libcurl connection handle.
 * > [C++ source code](https://github.com/JCMais/node-libcurl/blob/master/src/Easy.cc)
 *
 * It can be used by itself, in a synchronous way:
 * ```javascript
 * import { Curl, CurlCode, Easy } from 'node-libcurl'
 * import { StringDecoder } from 'string_decoder'
 *
 * const decoder = new StringDecoder('utf8')
 * const easyHandle = new Easy()
 *
 * easyHandle.setOpt(Curl.option.URL, 'https://www.google.com')
 * // This is used to receive the headers
 * // See https://curl.haxx.se/libcurl/c/CURLOPT_HEADERFUNCTION.html
 * easyHandle.setOpt(Curl.option.HEADERFUNCTION, function (buf, size, nmemb) {
 *   console.log('Received some headers:', decoder.write(buf))
 *   return size * nmemb
 * })
 *
 * // This is used to receive the response data
 * // See https://curl.haxx.se/libcurl/c/CURLOPT_WRITEFUNCTION.html
 * easyHandle.setOpt(Curl.option.WRITEFUNCTION, function (buf, size, nmemb) {
 *   console.log('Received some body:', decoder.write(buf))
 *   return size * nmemb
 * })
 *
 * // this will trigger the request
 * const ret = easyHandle.perform()
 * // The Easy handle will block the JS main thread:
 * console.log('I will only show after the request has finished')
 * // In case there is something wrong, you can use Easy.strError to get a human readable string about the error
 * console.log(ret, ret === CurlCode.CURLE_OK, Easy.strError(ret))
 * // Remember to always close the handle after you have finished using it for good
 * easyHandle.close()
 * ```
 *
 * or with the {@link MultiNativeBinding | Multi} class, allowing asynchronous usage.
 *
 * @public
 */
export declare class EasyNativeBinding {
  /**
   * This will be `true` if the handle was added to a {@link MultiNativeBinding | `Multi`} handle.
   */
  readonly isInsideMultiHandle: boolean
  /**
   * This will be `true` if {@link monitorSocketEvents | `monitorSocketEvents`} was called.
   */
  readonly isMonitoringSockets: boolean
  /**
   * This will be `true` if {@link close | `close`} was not called.
   */
  readonly isOpen: boolean

  /**
   * You can set this to anything - Use it to bind some data to this Easy instance.
   *
   * This will not be copied to other instaces created when duplicating this one.
   */
  private: any

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
  ): CurlCode
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
  ): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: StringListOptions, value: string[] | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: BlobOptions,
    value: ArrayBuffer | Buffer | string | null,
  ): CurlCode
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
  ): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'CHUNK_END_FUNCTION',
    value: ((this: EasyNativeBinding) => CurlChunk) | null,
  ): CurlCode
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
  ): CurlCode
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
  ): CurlCode
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
  ): CurlCode
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
  ): CurlCode
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
  ): CurlCode
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
  ): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: 'TRAILERFUNCTION',
    value: ((this: EasyNativeBinding) => string[] | false) | null,
  ): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SHARE', value: Share | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HTTPPOST', value: HttpPostField[] | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'FTP_SSL_CCC', value: CurlFtpSsl | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'FTP_FILEMETHOD', value: CurlFtpMethod | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'GSSAPI_DELEGATION', value: CurlGssApi | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HEADEROPT', value: CurlHeader | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HTTP_VERSION', value: CurlHttpVersion | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'IPRESOLVE', value: CurlIpResolve | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'NETRC', value: CurlNetrc | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROTOCOLS', value: CurlProtocol | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROXY_SSL_OPTIONS', value: CurlSslOpt | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'PROXYTYPE', value: CurlProxy | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'REDIR_PROTOCOLS', value: CurlProtocol | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'RTSP_REQUEST', value: CurlRtspRequest | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSH_AUTH_TYPES', value: CurlSshAuth | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSL_OPTIONS', value: CurlSslOpt | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'SSLVERSION', value: CurlSslVersion | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'TIMECONDITION', value: CurlTimeCond | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'USE_SSL', value: CurlUseSsl | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(option: 'HSTS_CTRL', value: CurlHsts | null): CurlCode
  /**
   * Use {@link "Curl".Curl.option|`Curl.option`} for predefined constants.
   *
   *
   * Official libcurl documentation: [`curl_easy_setopt()`](http://curl.haxx.se/libcurl/c/curl_easy_setopt.html)
   */
  setOpt(
    option: Exclude<CurlOptionName, SpecificOptions>,
    value: string | number | boolean | null,
  ): CurlCode
  // END AUTOMATICALLY GENERATED CODE - DO NOT EDIT

  // overloaded getInfo definitions - changes made here must also be made in Curl.ts
  // TODO: do this automatically, like above.

  /**
   * Official libcurl documentation: [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *
   * @param info Info to retrieve. Use {@link "Curl".Curl.info | `Curl.info`} for predefined constants.
   */
  getInfo(info: 'CERTINFO'): GetInfoReturn<string[]>

  /**
   * Returns information about the finished connection.
   *
   * Official libcurl documentation: [`curl_easy_getinfo()`](http://curl.haxx.se/libcurl/c/curl_easy_getinfo.html)
   *
   * @param info Info to retrieve. Use {@link "Curl".Curl.info | `Curl.info`} for predefined constants.
   */
  getInfo(info: Exclude<CurlInfoName, CurlInfoNameSpecific>): GetInfoReturn

  /**
   * Sends arbitrary data over the established connection.
   *
   * See also {@link onSocketEvent | `onSocketEvent`}.
   *
   * Official libcurl documentation: [`curl_easy_send()`](http://curl.haxx.se/libcurl/c/curl_easy_send.html)
   */
  send(data: Buffer): { code: CurlCode; bytesSent: number }

  /**
   * Receives data over the established connection, data will be written to the passed buffer.
   *
   * See also {@link onSocketEvent | `onSocketEvent`}.
   *
   * Official libcurl documentation: [`curl_easy_recv()`](http://curl.haxx.se/libcurl/c/curl_easy_recv.html)
   */
  recv(storage: Buffer): { code: CurlCode; bytesReceived: number }

  /**
   * Performs the entire request in a blocking manner and returns when done.
   *
   * Official libcurl documentation: [`curl_easy_perform()`](http://curl.haxx.se/libcurl/c/curl_easy_perform.html)
   */
  perform(): CurlCode

  /**
   * Perform any connection upkeep checks.
   *
   * Official libcurl documentation: [curl_easy_upkeep()](http://curl.haxx.se/libcurl/c/curl_easy_upkeep.html)
   */
  upkeep(): CurlCode

  /**
   * Using this function, you can explicitly mark a running connection
   * to get paused, and you can unpause a connection that was previously paused.
   *
   * Use the {@link CurlPause | `CurlPause`} enum for predefined constants.
   *
   * Official libcurl documentation: [`curl_easy_pause()`](http://curl.haxx.se/libcurl/c/curl_easy_pause.html)
   */
  pause(bitmask: CurlPause): CurlCode

  /**
   * Reset this handle to their original state.
   *
   * This method is useful if you plan to reuse this handle later on.
   *
   * Official libcurl documentation: [`curl_easy_reset()`](http://curl.haxx.se/libcurl/c/curl_easy_reset.html)
   */
  reset(): CurlCode

  /**
   * Duplicate this handle with all their options and callbacks.
   *
   * Official libcurl documentation: [`curl_easy_duphandle()`](http://curl.haxx.se/libcurl/c/curl_easy_duphandle.html)
   */
  dupHandle(): EasyNativeBinding

  /**
   * This method is only useful when the internal polling of the connection socket is enabled by calling
   *  {@link monitorSocketEvents | `monitorSocketEvents`}.
   *
   * The passed callback is going to be called everytime there are changes to the connection socket.
   *
   * One use case for this is when using the {@link send | `send`} and {@link recv | `recv`} methods
   *
   * A full example is available at [examples/15-send-recv-methods.js](https://github.com/JCMais/node-libcurl/blob/master/examples/15-send-recv-methods.js)
   *
   * Pass `null` to remove the current callback set.
   */
  onSocketEvent(
    cb: ((error: Error | null, events: SocketState) => void) | null,
  ): this

  /**
   * Start monitoring for events in the connection socket used by this handle.
   *
   * This is only useful if using the {@link onSocketEvent | `onSocketEvent`} callback.
   *
   * This method will throw an Error if the handle is already monitoring socket events.
   * You can use {@link isMonitoringSockets | `isMonitoringSockets`} to check if socket events are already being monitored or not.
   */
  monitorSocketEvents(): this

  /**
   * Stop monitoring for events in the connection socket used by this handle.
   *
   * This method will throw an Error if the handle is not monitoring socket events.
   * You can use {@link isMonitoringSockets | `isMonitoringSockets`} to check if socket events are already being monitored or not.
   */
  unmonitorSocketEvents(): this

  /**
   * Close this handle and dispose any resources bound to it.
   * After closed, the handle **MUST** not be used again, doing so will throw an Error.
   *
   * This is basically the same than [`curl_easy_cleanup()`](http://curl.haxx.se/libcurl/c/curl_easy_cleanup.html)
   */
  close(): void

  // below ones are duplicated from below
  //  just so that it also appears on the documentation for this class

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [`curl_easy_strerror()`](http://curl.haxx.se/libcurl/c/curl_easy_strerror.html)
   */
  static strError(errorCode: CurlCode): string
}

export declare interface EasyNativeBindingObject {
  new (): EasyNativeBinding

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [`curl_easy_strerror()`](http://curl.haxx.se/libcurl/c/curl_easy_strerror.html)
   */
  strError(errorCode: CurlCode): string
}
