/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L741
/**
 * Object with constants for option `SSH_AUTH_TYPES`
 *
 * `CURLSSH_AUTH_PASSWORD` becomes `CurlSshAuth.Password`
 *
 * @public
 */
export enum CurlSshAuth {
  /**
   * all types supported by the server
   */
  Any = ~0,
  /**
   * none allowed, silly but complete
   */
  None = 0,
  /**
   * public/private key files
   */
  PublicKey = 1 << 0,
  /**
   * password
   */
  Password = 1 << 1,
  /**
   * host key files
   */
  Host = 1 << 2,
  /**
   * keyboard interactive
   */
  Keyboard = 1 << 3,
  /**
   * agent (ssh-agent, pageant...)
   */
  Agent = 1 << 4,
  /**
   * gssapi (kerberos, ...)
   */
  GssApi = 1 << 5,
  Default = Any,
}
