/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 * For the next methods reading this is very important: https://tools.ietf.org/html/rfc6455#section-5
 *
 *    0                   1                   2                   3
 *    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 *   +-+-+-+-+-------+-+-------------+-------------------------------+
 *   |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 *   |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 *   |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 *   | |1|2|3|       |K|             |                               |
 *   +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 *   |     Extended payload length continued, if payload len == 127  |
 *   + - - - - - - - - - - - - - - - +-------------------------------+
 *   |                               |Masking-key, if MASK set to 1  |
 *   +-------------------------------+-------------------------------+
 *   | Masking-key (continued)       |          Payload Data         |
 *   +-------------------------------- - - - - - - - - - - - - - - - +
 *   :                     Payload Data continued ...                :
 *   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 *   |                     Payload Data continued ...                |
 *   +---------------------------------------------------------------+
 *
 */

/**
 * TODO: Handle message fragmentation?
 *
 * @param {Buffer} frame
 */
function readFrame(frame) {
  const firstByte = frame.readUInt8(0)

  const fin = ((firstByte & 0b10000000) === 0b10000000) | 0
  const rs1 = firstByte & 0b01000000
  const rs2 = firstByte & 0b00100000
  const rs3 = firstByte & 0b00010000
  const opc = firstByte & 0b00001111

  let result = {
    fin,
    rs1,
    rs2,
    rs3,
    opc,
  }

  const secondByte = frame.readUInt8(1)
  const mask = secondByte & 0b10000000
  const length = secondByte & 0b01111111

  let payloadLength = length

  // 2 is the default for when the payload length <= 125
  // in this case, the masking key (if it exists) is
  // in the third byte (index 2)
  let byteOffset = 2

  // if length === 126, the length itself is in the next 16 bits
  // so we must bump the offset by 8 bytes (16 bits)
  if (length === 126) {
    byteOffset += 2
    // all data in the websockets message frame uses network byte order
    // which is big endian
    payloadLength = frame.readUInt16BE(2)
    // otherwise, if length === 127, the length is in the next 64 bits
    // so we must bump the offset by 8 bytes (64 bits)
  } else if (length === 127) {
    byteOffset += 8

    const payloadLength32 = frame.readUInt32BE(2)
    // max safe integer in JavaScript is 2^53 - 1
    // this was taken from the ws package
    if (payloadLength32 > Math.pow(2, 53 - 32) - 1) {
      throw new WebSocketError(
        'Unsupported WebSocket frame: payload length > 2^53 - 1',
        1009,
      )
    }

    payloadLength = payloadLength32 * Math.pow(2, 32) + frame.readUInt32BE(6)
  }

  let maskingKey = null
  if (mask) {
    // masking key takes 32 bits in length
    // so 4 bytes
    maskingKey = frame.slice(byteOffset, byteOffset + 4)
    byteOffset += 4
  }

  let payload = null

  if (length) {
    payload = frame.slice(byteOffset, byteOffset + payloadLength)

    if (maskingKey) {
      // this is the way to unmask the value
      // see https://tools.ietf.org/html/rfc6455#section-5.3
      for (var i = 0; i < payload.length; i++) {
        // we could use bitwise and here, & 3 (or & 0x3)
        payload[i] = payload[i] ^ maskingKey[i % 4]
      }
    }
  }

  const remaining = frame.slice(byteOffset + payloadLength)

  return {
    ...result,
    payload,
    remaining: remaining && remaining.length ? remaining : null,
  }
}

/**
 * @param {Buffer} data
 * @param {Number} type This is the first byte of the frame, it includes the fin, rsvn and opcode
 */
function packFrame(data, type) {
  const length = data.length
  // initial offset is 6
  // 1 byte for the first part (fin, rsvn, opcode)
  // 1 byte for the mask and payload length(first part)
  // 4 bytes for the mask key
  // if the length is less than or equal 125, we are able to store in the 7 bits
  // we have in the first length part of the frame, so no need to change the offset
  let payloadOffset = 6
  let payloadLength = data.length

  // our key
  const maskingKey = new Uint8Array([0x12, 0x34, 0x56, 0x78])
  // const maskingKey = Buffer.alloc(4)
  // crypto.randomFillSync(maskingKey, 0, 4);

  // if the length is bigger than 65535
  // then we will need to use all the payload storage we have in the frame
  // which means adding more 8 bytes (64 bits)
  if (length > 0xffff) {
    payloadOffset += 8
    payloadLength = 127
    // if the length is bigger than 125, then we just need
    // more 2 bytes (16 bits)
  } else if (length >= 126) {
    payloadOffset += 2
    payloadLength = 126
  }

  const frame = Buffer.alloc(length + payloadOffset)

  // fin, rsvn and opcode
  frame[0] = type

  // first part of the payload length, including mask bit set
  frame[1] = payloadLength | 0b10000000

  if (payloadLength === 126) {
    frame.writeUInt16BE(data.length, 2)
  } else if (payloadLength === 127) {
    frame.writeUInt32BE(0, 2)
    frame.writeUInt32BE(data.length, 6)
  }

  // masking key
  frame[payloadOffset - 4] = maskingKey[0]
  frame[payloadOffset - 3] = maskingKey[1]
  frame[payloadOffset - 2] = maskingKey[2]
  frame[payloadOffset - 1] = maskingKey[3]

  for (let i = 0; i < length; i++) {
    // we could use bitwise and here, & 3 (or & 0x3)
    frame[payloadOffset + i] = data[i] ^ maskingKey[i % 4]
  }

  return frame
}

const packMessageFrame = (data) => packFrame(data, 0b10000001)
const packPingFrame = (data = Buffer.alloc(0)) => packFrame(data, 0b10001001)
const packPongFrame = (data = Buffer.alloc(0)) => packFrame(data, 0b10001010)
const packCloseFrame = (code = 1000, message = Buffer.alloc(0)) => {
  // TODO: add validation for the code and message here.
  // example: the message itself cannot be bigger than 123 bytes.

  const data = Buffer.alloc(2 + message.length)

  data.writeUInt16BE(code, 0)
  if (message.length) {
    message.copy(data, 2)
  }

  return packFrame(data, 0b10000000 | 0x8)
}
const WEBSOCKET_FRAME_OPCODE = {
  CONT: 0x0,
  NON_CONTROL_TEXT: 0x1,
  NON_CONTROL_BINARY: 0x2,
  CONTROL_CLOSE: 0x8,
  CONTROL_PING: 0x9,
  CONTROL_PONG: 0xa,
}

class WebSocketError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

module.exports = {
  packCloseFrame,
  packFrame,
  packMessageFrame,
  packPingFrame,
  packPongFrame,
  readFrame,
  WEBSOCKET_FRAME_OPCODE,
  WebSocketError,
}
