// https://github.com/curl/curl/blob/e1be82545348/include/curl/curl.h#L318
/**
 * Object to be used as the return value for the callbacks set
 *  with the options `CHUNK_BGN_FUNCTION` and `CHUNK_END_FUNCTION`.
 *
 * `CURL_CHUNK_BGN_FUNC_OK` becomes `CurlChunk.BgnFuncOk`
 */
export enum CurlChunk {
  BgnFuncOk = 0,
  BgnFuncFail = 1,
  BgnFuncSkip = 2,

  EndFuncOk = 0,
  EndFuncFail = 1,
}
