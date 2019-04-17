/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { MultiOptionName } from '../generated/MultiOption'
import { CurlMultiCode, CurlCode } from '../enum/CurlCode'

import { EasyNativeBinding } from './EasyNativeBinding'

/**
 * OnMessage callback called when there are new informations about handles inside this multi instance.
 */

export declare class MultiNativeBinding {
  /**
   * Use `Curl.multi` for predefined constants.
   *
   * Official libcurl documentation: [curl_multi_setopt()](http://curl.haxx.se/libcurl/c/curl_multi_setopt.html)
   */
  setOpt(option: MultiOptionName, value: number): CurlMultiCode

  /**
   * Adds an easy handle to be managed by this multi instance.
   *
   * Official libcurl documentation: [curl_multi_add_handle()](http://curl.haxx.se/libcurl/c/curl_multi_add_handle.html)
   *
   */
  addHandle(handle: EasyNativeBinding): CurlMultiCode

  /**
   * Removes an easy handle that was inside this multi instance.
   *
   * Official libcurl documentation: [curl_multi_remove_handle()](http://curl.haxx.se/libcurl/c/curl_multi_remove_handle.html)
   */
  removeHandle(handle: EasyNativeBinding): CurlMultiCode

  /**
   *
   * OnMessage callback is called when there are new informations about handles inside this multi instance.
   *
   * This is basically an abstraction over [curl_multi_info_read()](http://curl.haxx.se/libcurl/c/curl_multi_info_read.html)
   *
   * Pass `null` to remove the current callback set
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
   * Returns the number of easy handles that are inside this multi instance
   */
  getCount(): number

  /**
   * Closes this multi handle.
   *
   * This is basically the same than [curl_multi_cleanup()](http://curl.haxx.se/libcurl/c/curl_multi_cleanup.html)
   */
  close(): void
}

export declare interface MultiNativeBindingObject {
  new (): MultiNativeBinding

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [curl_multi_strerror()](http://curl.haxx.se/libcurl/c/curl_multi_strerror.html)
   */
  strError(errorCode: CurlMultiCode): string
}
