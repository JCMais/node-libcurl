/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * node-libcurl
 * @packageDocumentation
 */
export { Curl } from './Curl'
export { Easy } from './Easy'
export { Multi } from './Multi'
export { Share } from './Share'
export { curly, CurlyFunction, CurlyResult } from './curly'

// enums
export * from './enum/CurlAuth'
export * from './enum/CurlChunk'
export * from './enum/CurlCode'
export * from './enum/CurlFeature'
export * from './enum/CurlFileType'
export * from './enum/CurlFnMatchFunc'
export * from './enum/CurlFtpMethod'
export * from './enum/CurlFtpSsl'
export * from './enum/CurlGlobalInit'
export * from './enum/CurlGssApi'
export * from './enum/CurlHeader'
export * from './enum/CurlHsts'
export * from './enum/CurlHttpVersion'
export * from './enum/CurlInfoDebug'
export * from './enum/CurlIpResolve'
export * from './enum/CurlNetrc'
export * from './enum/CurlPause'
export * from './enum/CurlPipe'
export * from './enum/CurlProgressFunc'
export * from './enum/CurlProtocol'
export * from './enum/CurlProxy'
export * from './enum/CurlPush'
export * from './enum/CurlPx'
export * from './enum/CurlReadFunc'
export * from './enum/CurlRtspRequest'
export * from './enum/CurlShareLock'
export * from './enum/CurlShareOption'
export * from './enum/CurlSshAuth'
export * from './enum/CurlSslOpt'
export * from './enum/CurlSslVersion'
export * from './enum/CurlTimeCond'
export * from './enum/CurlUseSsl'
export * from './enum/CurlVersion'
export * from './enum/CurlWriteFunc'
export * from './enum/SocketState'

// types that can be helpful for library consumer

export { HeaderInfo } from './parseHeaders'
export { CurlInfo, CurlInfoName } from './generated/CurlInfo'
export {
  CurlOption,
  CurlOptionName,
  CurlOptionValueType,
} from './generated/CurlOption'
export { MultiOption, MultiOptionName } from './generated/MultiOption'

export { FileInfo, Http2PushFrameHeaders, HttpPostField } from './types'
