// This should be kept in sync with the options on src/Curl.cc curlMultiOptionNotImplemented
const multiOptionsBlacklist = [
  'SOCKETFUNCTION',
  'SOCKETDATA',
  'TIMERFUNCTION',
  'TIMERDATA',
  'PUSHFUNCTION',
  'PUSHDATA',
  // Those have been deprecated and support was removed with libcurl 7.62
  //  https://github.com/curl/curl/blob/curl-7_61_1/docs/DEPRECATE.md#http-pipelining
  // They currently do nothing, so I'm not documenting them
  'PIPELINING',
  'PIPELINING_SERVER_BL',
  'PIPELINING_SITE_BL',
]

module.exports = {
  multiOptionsBlacklist,
}
