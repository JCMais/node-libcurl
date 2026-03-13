/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// https://github.com/curl/curl/blob/master/include/curl/websockets.h
/**
 * WebSocket frame flags
 *
 * These flags are used to identify the type of WebSocket frame and its properties.
 * The frame type flags (Text, Binary, Close, Ping, Pong) are mutually exclusive.
 *
 * `CURLWS_TEXT` becomes `CurlWs.Text`
 *
 * @public
 */
export enum CurlWs {
  /**
   * The frame contains text data. Note that libcurl does not verify that
   * the content is valid UTF-8.
   */
  Text = 1 << 0,
  /**
   * The frame contains binary data.
   */
  Binary = 1 << 1,
  /**
   * This is a continuation frame. It implies there is another fragment coming
   * as part of the same message. Only one fragmented message can be transmitted
   * at a time, but it may be interrupted by control frames (Close, Ping, Pong).
   */
  Cont = 1 << 2,
  /**
   * This is a close frame. It may contain a 2-byte unsigned integer in network
   * byte order that indicates the close reason and may additionally contain up
   * to 123 bytes of further textual payload.
   */
  Close = 1 << 3,
  /**
   * This is a ping frame. It may contain up to 125 bytes of payload.
   * libcurl automatically responds with a pong message unless disabled via
   * WS_OPTIONS.
   */
  Ping = 1 << 4,
  /**
   * This is a pong frame. It may contain up to 125 bytes of payload.
   */
  Pong = 1 << 5,
  /**
   * Used when sending partial frames. The provided data is only a partial frame
   * and there is more coming in a following call to wsSend().
   */
  Offset = 1 << 6,
}

/**
 * WebSocket options flags
 *
 * These flags are used with the WS_OPTIONS curl option.
 *
 * @public
 */
export enum CurlWsOptions {
  /**
   * Passes on the data from the network without parsing it, leaving that
   * entirely to the application. This mode is intended for applications that
   * already have a WebSocket parser/engine.
   */
  RawMode = 1 << 0,
  /**
   * Tells libcurl to not automatically respond to PING frames with PONG.
   */
  NoAutoPong = 1 << 1,
}
