/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/de1004eb0f917b265f187c14d9abaaf7f13f8422/include/curl/curl.h#L995
/**
 * Object with bitmasks that should be used with the `HSTS_CTRL` option.
 *
 * `CURLAUTH_BASIC` becomes `CurlAuth.Basic`
 *
 * @public
 */
export enum CurlHsts {
  /**
   * Disable the in-memory HSTS cache for this handle.
   */
  Disabled = 0,
  /**
   * Enable the in-memory HSTS cache for this handle.
   */
  Enable = 1 << 0,
  /**
   * Make the HSTS file (if specified) read-only - makes libcurl not save the cache to the file when closing the handle.
   */
  ReadonlyFile = 2 << 0,
}

// https://github.com/curl/curl/blob/de1004eb0f917b265f187c14d9abaaf7f13f8422/include/curl/curl.h#L981-L985
/**
 * Object with constants to be used as the return value for the callbacks set for options `HSTSWRITEFUNCTION` and `HSTSREADFUNCTION`.
 *
 * `CURLSTS_OK` becomes `CurlHstsCallback.Ok`
 *
 * @public
 */
export enum CurlHstsCallback {
  Ok = 0,
  Done = 1,
  Fail = 2,
}

export interface CurlHstsCacheCount {
  /**
   * The index for the current cache entry.
   */
  index: number

  /**
   * The total count of cache entries.
   */
  count: number
}

export interface CurlHstsCacheEntry {
  /**
   * The host name.
   *
   * Example: `google.com`
   */
  host: string

  /**
   * If subdomains must be included. If not set, defaults to `false`.
   */
  includeSubDomains?: boolean

  /**
   * The expiration date for the cache entry as a string in the following format:
   * ```
   * 'YYYYMMDD HH:MM:SS'
   * ```
   *
   * If not set or if null, it will default to a date far away in the future (currently `99991231 23:59:59`).
   */
  expire?: string | null
}
