/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import './moduleSetup'

import { Readable } from 'stream'
import { CurlMime } from './CurlMime'
import { CurlReadFunc } from './enum/CurlReadFunc'

/**
 * Type definition for MIME data callback functions.
 *
 * @public
 */
export interface MimeDataCallbacks {
  /**
   * Read callback to provide data chunks.
   *
   * @param size - Maximum number of bytes to read
   * @returns Buffer, string, null for EOF, or CurlReadFunc value (Pause/Abort)
   *
   * @remarks
   * When `CurlReadFunc.Pause` is returned, the transfer will be paused until it is
   * explicitly resumed by calling `handle.pause(handle.pauseFlags & ~CurlPause.Recv)`.
   * When `CurlReadFunc.Abort` is returned, the transfer will be aborted.
   *
   * @example
   * ```typescript
   * read: (size) => {
   *   if (offset >= data.length) return null  // EOF
   *   const chunk = data.slice(offset, offset + size)
   *   offset += chunk.length
   *   return chunk
   * }
   * ```
   */
  read: (size: number) => Buffer | string | null | CurlReadFunc

  /**
   * Optional seek callback for repositioning the data stream.
   *
   * @param offset - The offset to seek to
   * @param origin - Seek origin: 0=SEEK_SET, 1=SEEK_CUR, 2=SEEK_END
   * @returns `true` if seek succeeded, `false` otherwise
   *
   * @example
   * ```typescript
   * seek: (offset, origin) => {
   *   if (origin === 0) {  // SEEK_SET
   *     currentOffset = offset
   *     return true
   *   }
   *   return false  // Other origins not supported
   * }
   * ```
   */
  seek?: (offset: number, origin: number) => boolean

  /**
   * Optional cleanup callback called when the part is freed.
   *
   * @example
   * ```typescript
   * free: () => {
   *   console.log('Cleaning up resources')
   * }
   * ```
   */
  free?: () => void
}

/**
 * `CurlMimePart` class that represents a single part in a MIME structure.
 * > [C++ source code](https://github.com/JCMais/node-libcurl/blob/master/src/CurlMime.cc)
 *
 * This class is used to configure individual parts of a multipart form data upload.
 * Instances are created by calling {@link CurlMime.addPart}.
 *
 * @remarks
 * Each part can have:
 * - A field name (via {@link setName})
 * - Data content (via {@link setData}, {@link setFiledata}, or {@link setDataCallback})
 * - A content type (via {@link setType})
 * - A filename (via {@link setFilename})
 * - Content encoding (via {@link setEncoder})
 * - Custom headers (via {@link setHeaders})
 * - Nested subparts (via {@link setSubparts})
 *
 * All setter methods return `this` for method chaining and throw {@link CurlEasyError} on error.
 *
 * @example
 * Basic text field with method chaining:
 * ```typescript
 * mime.addPart()
 *   .setName('username')
 *   .setData('john_doe')
 * ```
 *
 * @example
 * File upload with method chaining:
 * ```typescript
 * mime.addPart()
 *   .setName('avatar')
 *   .setFiledata('/path/to/image.png')
 *   .setType('image/png')
 *   .setFilename('avatar.png')
 * ```
 *
 * @public
 */
// @ts-expect-error - we are abusing TS merging here to have sane types for the addon classes
declare class CurlMimePart {
  /**
   * Sets the field name for this MIME part.
   *
   * @param name - The field name, or `null` to reset
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @example
   * ```typescript
   * part.setName('username').setData('john_doe')
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_name.html | curl_mime_name}
   */
  setName(name: string | null): this

  /**
   * Sets the data content for this MIME part from a string or Buffer.
   *
   * @param data - The data as a string or Buffer, or `null` to reset
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * The data is copied internally, so it's safe to reuse or modify the
   * buffer after calling this method.
   *
   * @example
   * ```typescript
   * part.setName('file').setData('Hello World').setType('text/plain')
   * // or
   * part.setData(Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]))
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_data.html | curl_mime_data}
   */
  setData(data: string | Buffer | null): this

  /**
   * Sets the data content for this MIME part by reading from a file.
   *
   * @param filepath - Path to the file, or `null` to reset
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * The file is streamed during transfer for memory efficiency.
   * The file must be readable when the transfer starts.
   *
   * @example
   * ```typescript
   * part.setName('document').setFiledata('/path/to/document.pdf').setType('application/pdf')
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_filedata.html | curl_mime_filedata}
   */
  setFiledata(filepath: string | null): this

  /**
   * Sets the content type (MIME type) for this part.
   *
   * @param mimetype - The MIME type string, or `null` to use default
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @example
   * ```typescript
   * part.setName('avatar').setFiledata('image.png').setType('image/png')
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_type.html | curl_mime_type}
   */
  setType(mimetype: string | null): this

  /**
   * Sets the remote filename for this part.
   *
   * @param filename - The filename to send, or `null` to reset
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * This appears in the Content-Disposition header and can be different
   * from the actual local filename when using {@link setFiledata}.
   *
   * @example
   * ```typescript
   * part.setFiledata('/tmp/temp123.jpg').setFilename('profile-photo.jpg')
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_filename.html | curl_mime_filename}
   */
  setFilename(filename: string | null): this

  /**
   * Sets the content transfer encoding for this part.
   *
   * @param encoding - Encoding scheme: 'binary', '8bit', '7bit', 'base64', 'quoted-printable', or `null` to disable
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * - 'binary': No encoding, header added
   * - '8bit': No encoding, header added
   * - '7bit': Validates 7-bit compliance
   * - 'base64': Base64 encoding
   * - 'quoted-printable': Quoted-printable encoding
   *
   * Do NOT use encoding with multipart content (subparts).
   *
   * @example
   * ```typescript
   * part.setName('data').setData(binaryData).setEncoder('base64')
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_encoder.html | curl_mime_encoder}
   */
  setEncoder(
    encoding: 'binary' | '8bit' | '7bit' | 'base64' | 'quoted-printable' | null,
  ): this

  /**
   * Sets custom headers for this MIME part.
   *
   * @param headers - Array of header strings, or `null` to reset
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * Each header should be in the format "Header-Name: value".
   *
   * @example
   * ```typescript
   * part.setName('doc').setData('content').setHeaders([
   *   'Content-ID: <document123>',
   *   'X-Custom-Header: custom-value'
   * ])
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_headers.html | curl_mime_headers}
   */
  setHeaders(headers: string[] | null): this

  /**
   * Sets a MIME structure as nested subparts of this part.
   *
   * @param mime - A CurlMime instance to use as subparts, or `null` to reset
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * Ownership of the MIME structure transfers to this part.
   * The subparts MIME object should not be used after this call.
   *
   * @example
   * ```typescript
   * const subMime = new CurlMime(curl)
   * subMime
   *   .addPart()
   *   .setName('nested_field')
   *   .setData('nested content')
   *
   * mime
   *   .addPart()
   *   .setName('multipart_section')
   *   .setSubparts(subMime)
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_subparts.html | curl_mime_subparts}
   */
  setSubparts(mime: CurlMime | null): this

  /**
   * Sets a callback-based mechanism for supplying part content dynamically.
   *
   * @param size - Expected total size in bytes
   * @param callbacks - Object containing read, seek (optional), and free (optional) callbacks
   * @returns `this` for method chaining
   * @throws {CurlEasyError} Throws on error
   *
   * @remarks
   * Use this for streaming or dynamically generated content. The read callback
   * will be called multiple times to supply data chunks. Return `null` from
   * the read callback to signal EOF.
   *
   * @example
   * ```typescript
   * let offset = 0
   * const data = Buffer.from('Large data to stream...')
   *
   * part
   *   .setName('stream')
   *   .setDataCallback(data.length, {
   *     read: (size) => {
   *       if (offset >= data.length) return null  // EOF
   *       const chunk = data.slice(offset, offset + size)
   *       offset += chunk.length
   *       return chunk
   *     },
   *     seek: (offset, origin) => {
   *       if (origin === 0) {  // SEEK_SET
   *         offset = offset
   *         return true
   *       }
   *       return false
   *     }
   *   })
   * ```
   *
   * @see {@link https://curl.se/libcurl/c/curl_mime_data_cb.html | curl_mime_data_cb}
   */
  setDataCallback(size: number, callbacks: MimeDataCallbacks): this

  /**
   * Sets the data content for this MIME part from a Node.js Readable stream.
   *
   * @param stream - Node.js Readable stream to read data from
   * @param unpause - Callback function to unpause the transfer when data becomes available
   * @param size - Optional expected total size in bytes (for Content-Length header)
   * @returns `this` for method chaining
   * @throws {Error} Throws if stream emits an error
   *
   * @remarks
   * This method provides a wrapper around {@link setDataCallback} for working with
   * Node.js streams. The stream is kept in paused mode and data is read synchronously
   * when curl requests it. When no data is available, the transfer is paused using
   * `CurlReadFunc.Pause`, and the `unpause` callback is invoked when data becomes
   * available to resume the transfer.
   *
   * The `unpause` function should unpause the curl handle's receive operation, typically
   * by calling `handle.pause(handle.pauseFlags & ~CurlPause.Recv)`.
   *
   * For very large files, consider using {@link setFiledata} instead, as it streams
   * directly from disk without going through Node.js streams.
   *
   * @example
   * Stream from file with unpause:
   * ```typescript
   * import { createReadStream } from 'fs'
   * import { CurlPause } from 'node-libcurl'
   *
   * const stream = createReadStream('/path/to/file.txt')
   * const curl = new Curl()
   * const mime = new CurlMime(curl)
   *
   * mime
   *   .addPart()
   *   .setName('document')
   *   .setDataStream(stream, () => {
   *     curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv)
   *   })
   *   .setType('text/plain')
   * ```
   *
   * @example
   * Stream with known size:
   * ```typescript
   * import { createReadStream, statSync } from 'fs'
   * import { CurlPause } from 'node-libcurl'
   *
   * const filepath = '/path/to/file.txt'
   * const size = statSync(filepath).size
   * const stream = createReadStream(filepath)
   * const curl = new Curl()
   * const mime = new CurlMime(curl)
   *
   * mime
   *   .addPart()
   *   .setName('document')
   *   .setDataStream(
   *     stream,
   *     () => curl.pause(curl.handle.pauseFlags & ~CurlPause.Recv),
   *     size
   *   )
   * ```
   */
  setDataStream(stream: Readable, unpause: () => void, size?: number): this
}

const bindings: any = require('../lib/binding/node_libcurl.node')

// @ts-expect-error - we are abusing TS merging here to have sane types for the addon classes
const CurlMimePart = bindings.CurlMimePart as typeof CurlMimePart

// Add setDataStream method implementation
CurlMimePart.prototype.setDataStream = function (
  this: typeof CurlMimePart.prototype,
  stream: Readable,
  unpause: () => void,
  size?: number,
): typeof CurlMimePart.prototype {
  // Track stream state
  let streamEnded = false
  let streamError: Error | null = null
  let readable = false

  // Set up event listeners
  const onReadable = () => {
    readable = true
    unpause()
  }

  const onEnd = () => {
    streamEnded = true
    unpause()
    cleanup()
  }

  const onError = (err: Error) => {
    streamError = err
    streamEnded = true
    cleanup()
  }

  const cleanup = () => {
    stream.off('readable', onReadable)
    stream.off('end', onEnd)
    stream.off('error', onError)
  }

  // Set stream to paused (non-flowing) mode
  stream.pause()

  // Set up listeners
  stream.on('readable', onReadable)
  stream.on('end', onEnd)
  stream.on('error', onError)

  // Determine size parameter for setDataCallback
  // Use provided size or a large default for unknown sizes
  const callbackSize = size !== undefined ? size : -1

  // Set up curl callbacks using setDataCallback
  return this.setDataCallback(callbackSize, {
    read: (requestedSize: number) => {
      // Throw error if stream had an error
      if (streamError) {
        throw streamError
      }

      if (!readable) {
        return CurlReadFunc.Pause
      }

      // Try to read from stream
      const data = stream.read(requestedSize)

      // If no data available
      if (data === null) {
        if (streamEnded) {
          return null
        }
        return CurlReadFunc.Pause
      }

      return data instanceof Buffer ? data : Buffer.from(data)
    },
    free: () => {
      cleanup()
      stream.destroy()
    },
  })
}

export { CurlMimePart }
