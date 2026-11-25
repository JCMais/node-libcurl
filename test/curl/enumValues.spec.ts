/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, it, expect } from 'vitest'

import {
  Curl,
  CurlAltSvc,
  CurlFileType,
  CurlFtpAuth,
  CurlMultiNetworkChanged,
  CurlSshKeyMatch,
  CurlSshKeyType,
  CurlVersion,
} from '../../lib'

// these mirror the values in libcurl's curl.h / multi.h - they are part of
// the ABI contract, getting them wrong silently breaks user callbacks
describe('enum values match libcurl constants', () => {
  it('CurlSshKeyType matches enum curl_khtype', () => {
    expect(CurlSshKeyType.Unknown).toBe(0)
    expect(CurlSshKeyType.Rsa1).toBe(1)
    expect(CurlSshKeyType.Rsa).toBe(2)
    expect(CurlSshKeyType.Dss).toBe(3)
    expect(CurlSshKeyType.Ecdsa).toBe(4)
    expect(CurlSshKeyType.Ed25519).toBe(5)
  })

  it('CurlSshKeyMatch matches enum curl_khmatch', () => {
    expect(CurlSshKeyMatch.Ok).toBe(0)
    expect(CurlSshKeyMatch.Mismatch).toBe(1)
    expect(CurlSshKeyMatch.Missing).toBe(2)
  })

  it('CurlMultiNetworkChanged matches the CURLMNWC_* defines', () => {
    expect(CurlMultiNetworkChanged.ClearAll).toBe(1 << 0)
    const separateFlags = Curl.isVersionGreaterOrEqualThan(8, 20, 0)
    expect(CurlMultiNetworkChanged.ClearConns).toBe(separateFlags ? 2 : 1)
    expect(CurlMultiNetworkChanged.ClearDns).toBe(separateFlags ? 4 : 1)
  })

  it('CurlFileType matches enum curlfiletype', () => {
    expect(CurlFileType.File).toBe(0)
    expect(CurlFileType.Door).toBe(7)
    expect(CurlFileType.Unknown).toBe(8)
  })

  it('CurlVersion contains the HSTS and THREADSAFE feature bits', () => {
    expect(CurlVersion.Hsts).toBe(1 << 28)
    expect(CurlVersion.ThreadSafe).toBe(1 << 30)
  })

  it('CurlAltSvc matches the CURLALTSVC_* defines', () => {
    expect(CurlAltSvc.ReadonlyFile).toBe(1 << 2)
    expect(CurlAltSvc.H1).toBe(1 << 3)
    expect(CurlAltSvc.H2).toBe(1 << 4)
    expect(CurlAltSvc.H3).toBe(1 << 5)
  })

  it('CurlFtpAuth matches the CURLFTPAUTH_* defines', () => {
    expect(CurlFtpAuth.Default).toBe(0)
    expect(CurlFtpAuth.Ssl).toBe(1)
    expect(CurlFtpAuth.Tls).toBe(2)
  })
})
