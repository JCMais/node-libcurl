/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/master/include/curl/curl.h
/**
 * SSH host key types for use with {@link https://curl.se/libcurl/c/CURLOPT_SSH_HOSTKEYFUNCTION.html | CURLOPT_SSH_HOSTKEYFUNCTION}
 *
 * These values identify the type of SSH host key.
 *
 * `CURLKHTYPE_RSA` becomes `CurlSshKeyType.Rsa`
 *
 * @public
 */
export enum CurlSshKeyType {
  /**
   * Unknown key type
   */
  Unknown = 0,
  /**
   * RSA1 key (obsolete SSH protocol version 1)
   */
  Rsa1 = 1,
  /**
   * RSA key
   */
  Rsa = 2,
  /**
   * DSS key
   */
  Dss = 3,
  /**
   * ECDSA key
   */
  Ecdsa = 4,
  /**
   * ED25519 key
   */
  Ed25519 = 5,
}

/**
 * SSH host key match results for use with {@link https://curl.se/libcurl/c/CURLOPT_SSH_HOSTKEYFUNCTION.html | CURLOPT_SSH_HOSTKEYFUNCTION}
 *
 * These are return codes for the SSH host key callback function.
 *
 * `CURLKHMATCH_OK` becomes `CurlSshKeyMatch.Ok`
 *
 * @public
 */
export enum CurlSshKeyMatch {
  /**
   * The host key is accepted, the connection should continue.
   */
  Ok = 0,
  /**
   * The host key is rejected, the connection is canceled.
   */
  Mismatch = 1,
  /**
   * No matching host/key was found (reported by CURLOPT_SSH_KEYFUNCTION).
   */
  Missing = 2,
}
