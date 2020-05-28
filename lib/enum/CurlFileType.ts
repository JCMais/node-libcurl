/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/e1be8254534898/include/curl/curl.h#L264
/**
 * Object with constants on the {@link FileInfo | `FileInfo`} object,
 *  used alongside the `CHUNK_BGN_FUNCTION` option
 *
 * `CURLFILETYPE_DEVICE_BLOCK` becomes `CurlFileType.DeviceBlock`
 *
 * @public
 */
export enum CurlFileType {
  File,
  Directory,
  Symlink,
  DeviceBlock,
  DeviceChar,
  NamedPipe,
  Socket,
  Door,
}
