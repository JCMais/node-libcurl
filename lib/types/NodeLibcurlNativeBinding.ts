import {
  CurlNativeBindingObject,
  EasyNativeBindingObject,
  MultiNativeBindingObject,
  ShareNativeBindingObject,
} from './'

// type Constructable<T, B> = {
//   new (): T
// } & B

export interface NodeLibcurlNativeBinding {
  // This would work too, but I don't like it
  // Curl: Constructable<
  //   CurlNativeBinding,
  //   {
  //     globalInit(): void
  //   }
  // >
  Curl: CurlNativeBindingObject
  Easy: EasyNativeBindingObject
  Multi: MultiNativeBindingObject
  Share: ShareNativeBindingObject
}
