/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { MultiOptionName } from '../generated/MultiOption'
import { CurlMultiCode, CurlCode } from '../enum/CurlCode'
import { CurlPipe } from '../enum/CurlPipe'
import { CurlPush } from '../enum/CurlPush'

import { EasyNativeBinding } from './EasyNativeBinding'
import { Http2PushFrameHeaders } from './Http2PushFrameHeaders'

type SpecificOptions = 'PIPELINING'

/**
 * `Multi` class that acts as an wrapper around the native libcurl multi handle.
 * > [C++ source code](https://github.com/JCMais/node-libcurl/blob/master/src/Multi.cc)
 *
 * Using this class instead of just the {@link "Easy".Easy | Easy} allows one to run requests asynchronously.
 *
 * For usage see [examples/04-multi.js](https://github.com/JCMais/node-libcurl/blob/master/examples/04-multi.js)
 *
 * The {@link "Curl".Curl | Curl} class uses one of this internally to provide asynchronous usage of the library.
 *
 * @public
 */
export declare class MultiNativeBinding {
  /**
   * Sets the [`PIPELINING`](https://curl.haxx.se/libcurl/c/CURLMOPT_PIPELINING.html) option.
   *
   * Official libcurl documentation: [`curl_multi_setopt()`](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)
   */
  setOpt(option: 'PIPELINING', value: CurlPipe): CurlMultiCode

  /**
   * Sets the [`PUSHFUNCTION`](https://curl.haxx.se/libcurl/c/CURLMOPT_PUSHFUNCTION.html) option.
   *
   * @remarks
   * You **must** not use the {@link Http2PushFrameHeaders | `Http2PushFrameHeaders`} object outside
   *  of this callback, doing so will try to use memory that libcurl has already
   *  freed and, in the best case scenario, will cause a segmentation fault.
   *
   * In case you have denied the push, you **must** also not use the `duplicatedHandle`
   *  outside of this callback, as libcurl would already have closed it and you would
   *  try to access memory that has been freed.
   *
   * Errors thrown inside this callback will have the same effect than returning `CurlPush.Deny`.
   *
   * Per a libcurl limitation, there is no direct way to cancel the connection from inside
   *  this callback, a possible workaround is to return an error
   *  from another callback, like the progress one.
   *
   * Official libcurl documentation: [`curl_multi_setopt()`](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)
   */
  setOpt(
    option: 'PUSHFUNCTION',
    value: (
      parent: EasyNativeBinding,
      duplicatedHandle: EasyNativeBinding,
      pushFrameHeaders: Http2PushFrameHeaders,
    ) => CurlPush,
  ): CurlMultiCode

  /**
   * Sets options on this instance.
   *
   * Use {@link "Multi".Multi.multi | `Multi.option`} for predefined constants.
   *
   * Official libcurl documentation: [`curl_multi_setopt()`](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)
   */
  setOpt(
    option: Exclude<MultiOptionName, SpecificOptions>,
    value: number,
  ): CurlMultiCode

  /**
   * Adds an {@link "Easy".Easy | `Easy`} handle to be managed by this instance.
   *
   * The request will start right after calling this method.
   *
   * Official libcurl documentation: [`curl_multi_add_handle()`](http://curl.haxx.se/libcurl/c/curl_multi_add_handle.html)
   *
   */
  addHandle(handle: EasyNativeBinding): CurlMultiCode

  /**
   * Removes an {@link "Easy".Easy | `Easy`} handle that was inside this instance.
   *
   * Official libcurl documentation: [`curl_multi_remove_handle()`](http://curl.haxx.se/libcurl/c/curl_multi_remove_handle.html)
   */
  removeHandle(handle: EasyNativeBinding): CurlMultiCode

  /**
   * Allow to provide a callback that will be called when there are
   *  new information about the handles inside this instance.
   *
   * This is basically an abstraction over [`curl_multi_info_read()`](http://curl.haxx.se/libcurl/c/curl_multi_info_read.html)
   *
   * Pass `null` to remove the current callback set.
   */
  onMessage(
    cb:
      | ((
          error: Error,
          easyHandle: EasyNativeBinding,
          errorCode: CurlCode,
        ) => void)
      | null,
  ): this

  /**
   * Returns the number of {@link "Easy".Easy | 'Easy'} handles that are currently inside this instance
   */
  getCount(): number

  /**
   * Closes this multi handle.
   *
   * After the handle has been closed it must not be used again.
   *
   * This is basically the same than [`curl_multi_cleanup()`](http://curl.haxx.se/libcurl/c/curl_multi_cleanup.html)
   */
  close(): void

  // below ones are duplicated from below
  //  just so that it also appears on the documentation for this class

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [`curl_multi_strerror()`](http://curl.haxx.se/libcurl/c/curl_multi_strerror.html)
   */
  strError(errorCode: CurlMultiCode): string
}

export declare interface MultiNativeBindingObject {
  new (): MultiNativeBinding

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [`curl_multi_strerror()`](http://curl.haxx.se/libcurl/c/curl_multi_strerror.html)
   */
  strError(errorCode: CurlMultiCode): string
}
