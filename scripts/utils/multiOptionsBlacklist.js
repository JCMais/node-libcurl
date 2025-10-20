// This should be kept in sync with the options on src/Curl.cc curlMultiOptionNotImplemented
const multiOptionsBlacklist = [
  'CURLMOPT_SOCKETFUNCTION',
  'CURLMOPT_SOCKETDATA',
  'CURLMOPT_TIMERFUNCTION',
  'CURLMOPT_TIMERDATA',
  'CURLMOPT_PUSHDATA',
  'CURLMOPT_NOTIFYFUNCTION',
  'CURLMOPT_NOTIFYDATA',
  // Those have been deprecated and support was removed with libcurl 7.62
  //  https://github.com/curl/curl/blob/curl-7_61_1/docs/DEPRECATE.md#http-pipelining
  // They currently do nothing, so I'm not documenting them
  'CURLMOPT_PIPELINING',
  'CURLMOPT_PIPELINING_SERVER_BL',
  'CURLMOPT_PIPELINING_SITE_BL',
]

module.exports = {
  multiOptionsBlacklist,
}
