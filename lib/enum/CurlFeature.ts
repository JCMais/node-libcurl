/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @public
 */
export enum CurlFeature {
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
   * Data received is not stored inside this handle, implies NO_DATA_PARSING.
   */
  NoDataStorage = 1 << 2,

  /**
   * Header received is not stored inside this handle, implies NO_HEADER_PARSING.
   */
  NoHeaderStorage = 1 << 3,

  /**
   * Same than `NoDataStorage | NoHeaderStorage`, implies RAW.
   */
  NoStorage = NoDataStorage | NoHeaderStorage,
}
