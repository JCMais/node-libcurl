/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {
  CurlOptionName,
  CurlOptionCamelCaseMap,
  CurlOptionValueType,
} from './generated/CurlOption'

import { HeaderInfo } from './parseHeaders'

import { Curl } from './Curl'

/**
 * Object the curly call resolves to.
 *
 * @public
 */
export interface CurlyResult {
  /**
   * Data will be the body of the requested URL
   */
  data: string

  /**
   * Parsed headers
   *
   * See {@link HeaderInfo}
   */
  headers: HeaderInfo[]

  /**
   * HTTP Status code for the last request
   */
  statusCode: number
}

// This is basically http.METHODS
const methods = [
  'acl',
  'bind',
  'checkout',
  'connect',
  'copy',
  'delete',
  'get',
  'head',
  'link',
  'lock',
  'm-search',
  'merge',
  'mkactivity',
  'mkcalendar',
  'mkcol',
  'move',
  'notify',
  'options',
  'patch',
  'post',
  'propfind',
  'proppatch',
  'purge',
  'put',
  'rebind',
  'report',
  'search',
  'source',
  'subscribe',
  'trace',
  'unbind',
  'unlink',
  'unlock',
  'unsubscribe',
] as const

type HttpMethod = typeof methods[number]

interface CurlyHttpMethodCall {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class.
   *
   * The `curly.<field>` being used will be the HTTP verb sent.
   */
  (url: string, options?: CurlOptionValueType): Promise<CurlyResult>
}

type HttpMethodCalls = { [K in HttpMethod]: CurlyHttpMethodCall }

export interface CurlyFunction extends HttpMethodCalls {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class
   * It's also possible to request using a specific http verb
   *  directly by using `curl.<http-verb>(url)`
   */
  (url: string, options?: CurlOptionValueType): Promise<CurlyResult>
  create: () => CurlyFunction
}

const create = (): CurlyFunction => {
  function curly(
    url: string,
    options: CurlOptionValueType = {},
  ): Promise<CurlyResult> {
    const curlHandle = new Curl()

    curlHandle.setOpt('URL', url)

    for (const key of Object.keys(options)) {
      const keyTyped = key as keyof CurlOptionValueType

      const optionName: CurlOptionName =
        keyTyped in CurlOptionCamelCaseMap
          ? CurlOptionCamelCaseMap[
              keyTyped as keyof typeof CurlOptionCamelCaseMap
            ]
          : (keyTyped as CurlOptionName)

      // @ts-ignore @TODO Try to type this
      curlHandle.setOpt(optionName, options[key])
    }

    return new Promise((resolve, reject) => {
      try {
        curlHandle.on('end', (statusCode, data, headers) => {
          curlHandle.close()
          resolve({
            statusCode: statusCode as number,
            data: data as string,
            headers: headers as HeaderInfo[],
          })
        })

        curlHandle.on('error', (error, errorCode) => {
          curlHandle.close()
          // @ts-ignore
          error.code = errorCode
          reject(error)
        })

        curlHandle.perform()
      } catch (error) {
        curlHandle.close()
        reject(error)
      }
    })
  }

  curly.create = create

  const httpMethodOptionsMap: Record<
    string,
    null | ((m: string, o: CurlOptionValueType) => CurlOptionValueType)
  > = {
    get: null,
    post: (_m, o) => ({
      post: true,
      ...o,
    }),
    head: (_m, o) => ({
      nobody: true,
      ...o,
    }),
    _: (m, o) => ({
      customRequest: m,
      ...o,
    }),
  }

  for (const httpMethod of methods) {
    const httpMethodOptions =
      httpMethodOptionsMap[httpMethod] || httpMethodOptionsMap['_']

    // @ts-ignore
    curly[httpMethod] =
      httpMethodOptions === null
        ? curly
        : (url: string, options: CurlOptionValueType = {}) =>
            curly(url, {
              ...httpMethodOptions(httpMethod, options),
            })
  }

  // @ts-ignore
  return curly
}

/**
 * Curly function
 *
 * @public
 */
export const curly = create()
