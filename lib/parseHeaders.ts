/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/**
 * Whe data parsing is enabled on the {@link Curl} instance, the headers parameter passed
 *  to the `end` event's callback will be one array of this type.
 * @public
 */
export type HeaderInfo = {
  result?: {
    version: string
    code: number
    reason: string
  }
} & {
  'Set-Cookie'?: string[]
} & { [headerKey: string]: string }

/**
 * Parses the headers that were stored while
 *  the request was being processed.
 *
 * @internal
 */
export function parseHeaders(headersString: string): HeaderInfo[] {
  const headers = headersString.split(/\r?\n|\r/g)
  const len = headers.length
  const result = []

  let isStatusLine = true
  let currHeaders: HeaderInfo = {}

  for (let i = 0; i < len; i += 1) {
    // status line
    if (isStatusLine) {
      const header = headers[i].split(' ')

      currHeaders.result = {
        version: header.shift() || '',
        code: parseInt(header.shift() || '0', 10),
        reason: header.join(' '),
      }

      isStatusLine = false

      continue
    }

    // Empty string means empty line, which means another header group
    if (headers[i] === '') {
      result.push(currHeaders)
      currHeaders = {}

      isStatusLine = true

      continue
    }

    // the whitespace after the colon is optional (RFC 7230, header-field = field-name ":" OWS field-value OWS)
    const colonIndex = headers[i].indexOf(':')
    const headerName =
      colonIndex === -1 ? headers[i] : headers[i].slice(0, colonIndex)
    const headerValue =
      colonIndex === -1 ? '' : headers[i].slice(colonIndex + 1).trim()

    if (headerName.toUpperCase() === 'SET-COOKIE') {
      if (!currHeaders['Set-Cookie']) {
        currHeaders['Set-Cookie'] = []
      }

      currHeaders['Set-Cookie'].push(headerValue)
    } else {
      currHeaders[headerName] = headerValue
    }
  }

  return result
}
