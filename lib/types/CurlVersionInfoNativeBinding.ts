/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare interface CurlVersionInfoNativeBindingObject {
  protocols: string[]
  features: string[]
  rawFeatures: number
  version: string
  versionNumber: number
  sslVersion: string
  sslVersionNum: number
  libzVersion: string
  aresVersion: string | null
  aresVersionNumber: number
  libidnVersion: string | null
  iconvVersionNumber: number
  libsshVersion: string | null
  brotliVersionNumber: number
  brotliVersion: string | null
}
