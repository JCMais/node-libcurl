/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Flags to be used with {@link "Curl".Curl.enable | `Curl#enable`} and {@link "Curl".Curl.disable | `Curl#disable`}
 * @public
 */
export enum CurlFeature {
  /**
   * Initial state
   */
  Empty = 0,

  /**
   * Data received is passed as a Buffer to the end event.
   */
  NoDataParsing = 1 << 0,

  /**
   * Header received is not parsed, it's passed as a Buffer to the end event.
   */
  NoHeaderParsing = 1 << 1,

  /**
   * Same than `NoDataParsing | NoHeaderParsing`
   */
  Raw = NoDataParsing | NoHeaderParsing,

  /**
   * Data received is not stored inside this handle, implies `NoDataParsing`.
   */
  NoDataStorage = 1 << 2,

  /**
   * Header received is not stored inside this handle, implies `NoHeaderParsing`.
   */
  NoHeaderStorage = 1 << 3,

  /**
   * Same than `NoDataStorage | NoHeaderStorage`, implies `Raw`.
   */
  NoStorage = NoDataStorage | NoHeaderStorage,

  /**
   * This will change the behavior of the internal `WRITEFUNCTION` to push data into a stream instead of
   * buffering all the data into multiple `Buffer` chunks.
   *
   * As soon as the stream is available, it will be passed as the first argument for the `stream` event.
   *
   * Example usage:
   *
   * ```typescript
   *  const curl = new Curl()
   *  curl.setOpt('URL', 'https://some-domain/upload')
   *
   *  curl.setStreamProgressCallback(() => {
   *    // this will use the default progress callback from libcurl
   *    return CurlProgressFunc.Continue
   *  })
   *
   *  curl.on('end', (statusCode, data) => {
   *    console.log('\n'.repeat(5))
   *    console.log(
   *      `curl - end - status: ${statusCode} - data length: ${data.length}`,
   *    )
   *    curl.close()
   *  })
   *  curl.on('error', (error, errorCode) => {
   *    console.log('\n'.repeat(5))
   *    console.error('curl - error: ', error, errorCode)
   *    curl.close()
   *  })
   *  curl.on('stream', async (stream, _statusCode, _headers) => {
   *    const writableStream = fs.createWriteStream('./test.out')
   *    stream.pipe(writableStream)
   *  })
   *  curl.perform()
   * ```
   *
   * Using this implies `NoDataStorage`.
   *
   * To control the `highWaterMark` option of the response stream, see {@link "Curl".Curl.setStreamResponseHighWaterMark | `Curl#setStreamResponseHighWaterMark`}
   *
   * @remarks
   *
   * Make sure your libcurl version is greater than or equal 7.69.1.
   * Versions older than that one are not reliable for streams usage.
   */
  StreamResponse = 1 << 4,
}
