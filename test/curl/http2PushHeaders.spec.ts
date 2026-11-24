/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { expect, it } from 'vitest'

import type { Http2PushFrameHeaders } from '../../lib/types/Http2PushFrameHeaders'

it('rejects reads from an invalidated HTTP/2 push header wrapper', () => {
  const fixture = join(__dirname, '../fixtures/push-headers')
  execFileSync(process.execPath, [
    require.resolve('node-gyp/bin/node-gyp.js'),
    'rebuild',
    '--directory',
    fixture,
  ])

  const {
    headers,
    invalidate,
  }: {
    headers: Http2PushFrameHeaders
    invalidate: (headers: Http2PushFrameHeaders) => void
  } = require(join(fixture, 'build/Release/push_headers_fixture.node'))

  expect(headers.getByIndex(0)).toBe('x-test:example')
  expect(headers.getByName('x-test')).toBe('example')

  invalidate(headers)

  expect(() => headers.getByIndex(0)).toThrow(/only valid during/i)
  expect(() => headers.getByName('x-test')).toThrow(/only valid during/i)
})
