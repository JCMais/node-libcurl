const optionKindMap = {
  dataCallback: ['READFUNCTION', 'HEADERFUNCTION', 'WRITEFUNCTION'],
  progressCallback: ['PROGRESSFUNCTION', 'XFERINFOFUNCTION'],
  stringList: [
    'CONNECT_TO',
    'HTTP200ALIASES',
    'HTTPHEADER',
    'MAIL_RCPT',
    'PROXYHEADER',
    'POSTQUOTE',
    'PREQUOTE',
    'QUOTE',
    'RESOLVE',
    'TELNETOPTIONS',
  ],
  other: [
    'CHUNK_BGN_FUNCTION',
    'CHUNK_END_FUNCTION',
    'DEBUGFUNCTION',
    'FNMATCH_FUNCTION',
    'SEEKFUNCTION',
    'TRAILERFUNCTION',
    'SHARE',
    'HTTPPOST',
    // enums
    'FTP_SSL_CCC',
    'FTP_FILEMETHOD',
    'GSSAPI_DELEGATION',
    'HEADEROPT',
    'HTTP_VERSION',
    'IPRESOLVE',
    'NETRC',
    'PROTOCOLS',
    'PROXY_SSL_OPTIONS',
    'PROXYTYPE',
    'REDIR_PROTOCOLS',
    'RTSP_REQUEST',
    'SSH_AUTH_TYPES',
    'SSL_OPTIONS',
    'SSLVERSION',
    'TIMECONDITION',
    'USE_SSL',
    // @TODO ADD REMAINING OPTIONS WE HAVE ENUM FOR
  ],
}

const optionKindValueMap = {
  dataCallback:
    '((this: EasyNativeBinding, data: Buffer, size: number, nmemb: number) => number)',
  progressCallback:
    '((this: EasyNativeBinding, dltotal: number,dlnow: number,ultotal: number,ulnow: number) => number | CurlProgressFunc)',
  stringList: 'string[]',
  /* @TODO Add type definitions, they are on Curl.chunk */
  CHUNK_BGN_FUNCTION:
    '((this: EasyNativeBinding, fileInfo: FileInfo, remains: number) => CurlChunk)',
  /* @TODO Add type definitions, they are on Curl.chunk */
  CHUNK_END_FUNCTION: '((this: EasyNativeBinding) => CurlChunk)',
  /* @TODO Add type definitions, they are on Curl.info.debug */
  DEBUGFUNCTION:
    '((this: EasyNativeBinding, type: CurlInfoDebug, data: Buffer) => 0)',
  /* @TODO Add type definitions, they are on Curl.fnmatchfunc */
  FNMATCH_FUNCTION:
    '((this: EasyNativeBinding, pattern: string, value: string) => CurlFnMatchFunc)',
  HTTPPOST: 'HttpPostField[]',
  TRAILERFUNCTION: '((this: EasyNativeBinding) => string[] | false)',
  /* @TODO Add CURL_SEEKFUNC_* type definitions */
  SEEKFUNCTION:
    '((this: EasyNativeBinding, offset: number, origin: number) => number)',
  SHARE: 'Share',

  // enums
  FTP_SSL_CCC: 'CurlFtpSsl',
  FTP_FILEMETHOD: 'CurlFtpMethod',
  GSSAPI_DELEGATION: 'CurlGssApi',
  HEADEROPT: 'CurlHeader',
  HTTP_VERSION: 'CurlHttpVersion',
  IPRESOLVE: 'CurlIpResolve',
  NETRC: 'CurlNetrc',
  PROTOCOLS: 'CurlProtocol',
  PROXY_SSL_OPTIONS: 'CurlSslOpt',
  PROXYTYPE: 'CurlProxy',
  REDIR_PROTOCOLS: 'CurlProtocol',
  RTSP_REQUEST: 'CurlRtspRequest',
  SSH_AUTH_TYPES: 'CurlSshAuth',
  SSL_OPTIONS: 'CurlSslOpt',
  SSLVERSION: 'CurlSslVersion',
  TIMECONDITION: 'CurlTimeCond',
  USE_SSL: 'CurlUseSsl',
  _: 'string | number | boolean',
}

module.exports = {
  optionKindMap,
  optionKindValueMap,
}
