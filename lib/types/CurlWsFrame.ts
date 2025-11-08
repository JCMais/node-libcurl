/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { CurlWs } from '../enum/CurlWs'

/**
 * WebSocket frame metadata
 *
 * This structure contains information about a WebSocket frame received or being sent.
 * It is returned by {@link Easy.wsMeta | `Easy#wsMeta`} when called from within a
 * WRITEFUNCTION callback, or as part of the return value from {@link Easy.wsRecv | `Easy#wsRecv`}.
 *
 * The naming convention of the fields is following libcurl's own naming convention.
 *
 * @public
 */
export interface CurlWsFrame {
  /**
   * The age of this struct. Always zero for now.
   */
  age: number

  /**
   * Bitmask describing the WebSocket frame. See {@link CurlWs | `CurlWs`} for flag values.
   */
  flags: CurlWs

  /**
   * When this chunk is a continuation of frame data already delivered,
   * this is the offset into the final frame data where this piece belongs.
   */
  offset: number

  /**
   * If this is not a complete fragment, the bytesleft field informs about
   * how many additional bytes are expected to arrive before this fragment
   * is complete. If zero, the frame is complete.
   */
  bytesleft: number

  /**
   * The length of the current data chunk.
   */
  len: number
}
