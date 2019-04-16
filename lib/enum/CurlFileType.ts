// https://github.com/curl/curl/blob/e1be8254534898/include/curl/curl.h#L264
/**
 * Object with constants on the `FileInfo` object,
 *  used alongside the `CHUNK_BGN_FUNCTION` option
 *
 * `CURLFILETYPE_DEVICE_BLOCK` becomes `CurlFileType.DeviceBlock`
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
