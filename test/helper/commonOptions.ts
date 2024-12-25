import { Easy } from '../../lib'
import { Curl } from '../../lib/Curl'

export function withCommonTestOptions(curl: Curl | Easy | Record<string, any>) {
  const options = {
    // this can be used to set options across all tests
    ...(process.env.NODE_LIBCURL_VERBOSE_TESTS ? { VERBOSE: true } : {}),
  }

  if ('setOpt' in curl) {
    Object.entries(options).forEach(([key, value]) => {
      curl.setOpt(key, value)
    })
  } else {
    Object.assign(curl, options)
  }

  return options
}
