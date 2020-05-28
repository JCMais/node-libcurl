/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { CurlShareCode } from '../enum/CurlCode'

import { CurlShareOption } from '../enum/CurlShareOption'
import { CurlShareLock } from '../enum/CurlShareLock'

/**
 * `Share` class that acts as an wrapper around the native libcurl share handle.
 * > [C++ source code](https://github.com/JCMais/node-libcurl/blob/master/src/Share.cc)
 *
 * Using this class you should be able to share data between
 *  two {@link "Easy".Easy | Easy} handles, like cookies for instance.
 *
 * For usage see [examples/05-share.js](https://github.com/JCMais/node-libcurl/blob/master/examples/05-share.js)
 *
 * @public
 */
export declare class ShareNativeBinding {
  /**
   * You can use {@link CurlShareOption|`CurlShareOption`} and {@link CurlShareLock|`CurlShareLock`}
   *  for predefined constants.
   *
   * Official libcurl documentation: [`curl_share_setopt()`](http://curl.haxx.se/libcurl/c/curl_share_setopt.html)
   */
  setOpt(option: CurlShareOption, value: CurlShareLock): CurlShareCode

  /**
   * Closes this handle.
   *
   * After the handle has been closed it must not be used again.
   *
   * This is basically the same than [curl_share_cleanup()](http://curl.haxx.se/libcurl/c/curl_share_cleanup.html)
   */
  close(): void

  // below ones are duplicated from below
  //  just so that it also appears on the documentation for this class

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [`curl_share_strerror()`](http://curl.haxx.se/libcurl/c/curl_share_strerror.html)
   */
  strError(errorCode: CurlShareCode): string
}

export declare interface ShareNativeBindingObject {
  new (): ShareNativeBinding

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [`curl_share_strerror()`](http://curl.haxx.se/libcurl/c/curl_share_strerror.html)
   */
  strError(errorCode: CurlShareCode): string
}
