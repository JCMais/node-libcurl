import { CurlShareCode } from '../codes'

import { CurlShareOption } from '../enum/CurlShareOption'
import { CurlShareLock } from '../enum/CurlShareLock'

export declare class ShareNativeBinding {
  /**
   * Use `Curl.share` and `Curl.lock` for predefined constants.
   *
   * Official libcurl documentation: [curl_share_setopt()](http://curl.haxx.se/libcurl/c/curl_share_setopt.html)
   */
  setOpt(option: CurlShareOption, value: CurlShareLock): CurlShareCode

  /**
   * Closes this share handle.
   *
   * This is basically the same than [curl_share_cleanup()](http://curl.haxx.se/libcurl/c/curl_share_cleanup.html)
   */
  close(): void
}

export declare interface ShareNativeBindingObject {
  new (): ShareNativeBinding

  /**
   * Returns a description for the given error code.
   *
   * Official libcurl documentation: [curl_share_strerror()](http://curl.haxx.se/libcurl/c/curl_share_strerror.html)
   */
  strError(errorCode: CurlShareCode): string
}
