/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Object with bit flags to be used with the {@link "Curl".Curl.setOpt | `Curl#setOpt`} option `ALTSVC_CTRL`.
 *
 * `CURLALTSVC_H1` becomes `CurlAltSvc.H1`
 *
 * @public
 */
export enum CurlAltSvc {
  /**
   * Do not write the alt-svc cache back to the file specified with the
   * `ALTSVC` option even if it gets updated.
   */
  ReadonlyFile = 1 << 2,
  /**
   * Accept alternative services offered over HTTP/1.1.
   */
  H1 = 1 << 3,
  /**
   * Accept alternative services offered over HTTP/2.
   */
  H2 = 1 << 4,
  /**
   * Accept alternative services offered over HTTP/3.
   */
  H3 = 1 << 5,
}
