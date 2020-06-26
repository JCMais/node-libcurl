/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * This is the type of the argument passed to the first parameter of
 *
 * @public
 */
export interface Http2PushFrameHeaders {
  getByName(name: string): string | null
  getByIndex(index: number): string | null
  numberOfHeaders: number
}
