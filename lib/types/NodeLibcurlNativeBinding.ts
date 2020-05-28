/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  CurlNativeBindingObject,
  CurlVersionInfoNativeBindingObject,
  EasyNativeBindingObject,
  MultiNativeBindingObject,
  ShareNativeBindingObject,
} from './'

// type Constructable<T, B> = {
//   new (): T
// } & B

/**
 * This is the interface exported from the addon binding itself.
 * Not available for library users.
 *
 * @internal
 */
export interface NodeLibcurlNativeBinding {
  // This would work too, but I don't like it
  // Curl: Constructable<
  //   CurlNativeBinding,
  //   {
  //     globalInit(): void
  //   }
  // >
  Curl: CurlNativeBindingObject
  CurlVersionInfo: CurlVersionInfoNativeBindingObject
  Easy: EasyNativeBindingObject
  Multi: MultiNativeBindingObject
  Share: ShareNativeBindingObject
}
