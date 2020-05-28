/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * The `HTTPPOST` option accepts an array with this type.
 *
 * @public
 */
export type HttpPostField =
  | {
      /**
       * Field name
       */
      name: string
      /**
       * Field contents
       */
      contents: string
    }
  | {
      /**
       * Field name
       */
      name: string
      /**
       * File path
       */
      file: string
      /**
       * Content-Type
       */
      type?: string
      /**
       * File name to be used when uploading
       */
      filename?: string
    }
