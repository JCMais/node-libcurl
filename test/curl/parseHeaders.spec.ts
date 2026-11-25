/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { describe, it, expect } from 'vitest'

import { parseHeaders } from '../../lib/parseHeaders'

const buildHeadersString = (lines: string[]) =>
  ['HTTP/1.1 200 OK', ...lines, '', ''].join('\r\n')

describe('parseHeaders()', () => {
  it('should parse the status line', () => {
    const [headers] = parseHeaders(buildHeadersString(['Host: example.com']))

    expect(headers.result).toEqual({
      version: 'HTTP/1.1',
      code: 200,
      reason: 'OK',
    })
  })

  it('should parse headers with a space after the colon', () => {
    const [headers] = parseHeaders(buildHeadersString(['Host: example.com']))

    expect(headers['Host']).toBe('example.com')
  })

  it('should parse headers without a space after the colon', () => {
    const [headers] = parseHeaders(buildHeadersString(['Host:example.com']))

    expect(headers['Host']).toBe('example.com')
  })

  it('should parse headers with an empty value', () => {
    const [headers] = parseHeaders(buildHeadersString(['X-Empty:']))

    expect(headers['X-Empty']).toBe('')
  })

  it('should keep colons inside the header value', () => {
    const [headers] = parseHeaders(
      buildHeadersString(['Location: http://example.com/path']),
    )

    expect(headers['Location']).toBe('http://example.com/path')
  })

  it('should parse Set-Cookie headers into an array', () => {
    const [headers] = parseHeaders(
      buildHeadersString(['Set-Cookie: a=b', 'Set-Cookie:c=d']),
    )

    expect(headers['Set-Cookie']).toEqual(['a=b', 'c=d'])
  })

  it('should parse multiple header groups (redirects)', () => {
    const headersString = [
      'HTTP/1.1 301 Moved Permanently',
      'Location: /new',
      '',
      'HTTP/1.1 200 OK',
      'Content-Type: text/plain',
      '',
      '',
    ].join('\r\n')

    const groups = parseHeaders(headersString)

    expect(groups).toHaveLength(2)
    expect(groups[0].result?.code).toBe(301)
    expect(groups[0]['Location']).toBe('/new')
    expect(groups[1].result?.code).toBe(200)
    expect(groups[1]['Content-Type']).toBe('text/plain')
  })
})
