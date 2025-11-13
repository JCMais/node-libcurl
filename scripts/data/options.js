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
  blob: [
    'CAINFO_BLOB',
    'ISSUERCERT_BLOB',
    'SSLKEY_BLOB',
    'SSLCERT_BLOB',
    'PROXY_CAINFO_BLOB',
    'PROXY_SSLCERT_BLOB',
    'PROXY_SSLCERT',
    'PROXY_SSLKEY_BLOB',
  ],
  other: [
    'CHUNK_BGN_FUNCTION',
    'CHUNK_END_FUNCTION',
    'DEBUGFUNCTION',
    'FNMATCH_FUNCTION',
    'HSTSREADFUNCTION',
    'HSTSWRITEFUNCTION',
    'INTERLEAVEFUNCTION',
    'PREREQFUNCTION',
    'SEEKFUNCTION',
    'SSH_HOSTKEYFUNCTION',
    'TRAILERFUNCTION',
    'SHARE',
    'HTTPPOST',
    'STREAM_DEPENDS',
    'STREAM_DEPENDS_E',
    // enums
    'FTP_SSL_CCC',
    'FTP_FILEMETHOD',
    'GSSAPI_DELEGATION',
    'HEADEROPT',
    'HTTP_VERSION',
    'IPRESOLVE',
    'MIMEPOST',
    'MIME_OPTIONS',
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
    'WS_OPTIONS',
    'HSTS_CTRL',
    // @TODO ADD REMAINING OPTIONS WE HAVE ENUM FOR
  ],
}

const optionKindValueMap = {
  dataCallback:
    '((this: Easy, data: Buffer, size: number, nmemb: number) => number)',
  progressCallback:
    '((this: Easy, dltotal: number,dlnow: number,ultotal: number,ulnow: number) => number | CurlProgressFunc)',
  stringList: 'string[]',
  blob: 'ArrayBuffer | Buffer | string',
  /* @TODO Add type definitions, they are on Curl.chunk */
  CHUNK_BGN_FUNCTION:
    '((this: Easy, fileInfo: FileInfo, remains: number) => CurlChunk)',
  /* @TODO Add type definitions, they are on Curl.chunk */
  CHUNK_END_FUNCTION: '((this: Easy) => CurlChunk)',
  /* @TODO Add type definitions, they are on Curl.info.debug */
  DEBUGFUNCTION: '((this: Easy, type: CurlInfoDebug, data: Buffer) => 0)',
  /* @TODO Add type definitions, they are on Curl.fnmatchfunc */
  FNMATCH_FUNCTION:
    '((this: Easy, pattern: string, value: string) => CurlFnMatchFunc)',
  HSTSREADFUNCTION:
    '((this: Easy, options: { maxHostLengthBytes: number }) => null | CurlHstsCacheEntry | CurlHstsCacheEntry[])',
  HSTSWRITEFUNCTION:
    '((this: Easy, cacheEntry: CurlHstsCacheEntry, cacheCount: CurlHstsCacheCount) => any)',
  INTERLEAVEFUNCTION:
    '((this: Easy, data: Buffer, size: number, nmemb: number) => number)',
  PREREQFUNCTION:
    '((this: Easy, connPrimaryIp: string, connLocalIp: string, connPrimaryPort: number, conLocalPort: number) => CurlPreReqFunc)',
  SSH_HOSTKEYFUNCTION:
    '((this: Easy, keytype: CurlSshKeyType, key: Buffer) => CurlSshKeyMatch)',
  HTTPPOST: 'HttpPostField[]',
  TRAILERFUNCTION: '((this: Easy) => string[] | false)',
  /* @TODO Add CURL_SEEKFUNC_* type definitions */
  SEEKFUNCTION: '((this: Easy, offset: number, origin: number) => number)',
  SHARE: 'Share',
  MIMEPOST: 'CurlMime',
  STREAM_DEPENDS: 'Easy',
  STREAM_DEPENDS_E: 'Easy',

  // enums
  FTP_SSL_CCC: 'CurlFtpSsl',
  FTP_FILEMETHOD: 'CurlFtpMethod',
  GSSAPI_DELEGATION: 'CurlGssApi',
  HEADEROPT: 'CurlHeader',
  HTTP_VERSION: 'CurlHttpVersion',
  IPRESOLVE: 'CurlIpResolve',
  MIME_OPTIONS: 'CurlMimeOpt',
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
  WS_OPTIONS: 'CurlWsOptions',
  HSTS_CTRL: 'CurlHsts',
  _: 'string | number | boolean',
}

const optionExtraDescriptionValueMap = Object.fromEntries(
  Object.entries({
    HSTSREADFUNCTION: [
      '',
      'You can either return a single `CurlHstsReadCallbackResult` object or an array of `CurlHstsReadCallbackResult` objects.',
      'If returning an array, the callback will only be called once per request.',
      'If returning a single object, the callback will be called multiple times until `null` is returned.',
    ],
  }).map(([key, value]) => {
    return [
      key,
      `\n*\n${(Array.isArray(value)
        ? value.join('\n * ')
        : `* ${value}`
      ).trim()}`,
    ]
  }),
)

module.exports = {
  optionKindMap,
  optionKindValueMap,
  optionExtraDescriptionValueMap,
}
