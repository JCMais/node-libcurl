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
import { CurlFeature } from './enum/CurlFeature'

/**
 * Object the curly call resolves to.
 *
 * @public
 */
export interface CurlyResult<ResultData extends any> {
  /**
   * Data will be the body of the requested URL
   */
  data: ResultData

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

export type CurlyResponseBodyParser = (
  data: Buffer,
  header: HeaderInfo[],
) => any

export type CurlyResponseBodyParsersProperty = {
  [key: string]: CurlyResponseBodyParser
}

type CurlyOptions = CurlOptionValueType & {
  /**
   * This can be false to disable the automatic behavior
   *
   * If set to a function this will always be called
   * for all requests, ignoring other response body parsers.
   */
  curlyResponseBodyParser?: CurlyResponseBodyParser | false

  /**
   * Overwrite or add more response body parsers
   *
   * See {@link CurlyFunction.defaultResponseBodyParsers}
   */
  curlyResponseBodyParsers?: CurlyResponseBodyParsersProperty

  /**
   * If set, this value will always prefix the URL of the request.
   *
   * No special handling is done, so make sure you set the url correctly later on.
   */
  curlyBaseUrl?: string
}

interface CurlyHttpMethodCall {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class.
   *
   * The `curly.<field>` being used will be the HTTP verb sent.
   */
  <ResultData extends any = any>(url: string, options?: CurlyOptions): Promise<
    CurlyResult<ResultData>
  >
}

type HttpMethodCalls = { [K in HttpMethod]: CurlyHttpMethodCall }

/**
 * See {@link HttpMethodCalls} for list of methods.
 */
export interface CurlyFunction extends HttpMethodCalls {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class
   * It's also possible to request using a specific http verb
   *  directly by using `curl.<http-verb>(url: string, options?: CurlyOptions)`, like:
   *
   * ```js
   * curly.get('https://www.google.com')
   * ```
   */
  <ResultData extends any = any>(url: string, options?: CurlyOptions): Promise<
    CurlyResult<ResultData>
  >

  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * This returns a new `curly` with the specified options set by default.
   */
  create: (defaultOptions?: CurlyOptions) => CurlyFunction

  /**
   * These are the default response body parsers to be used.
   *
   * By default there are parsers for the following:
   *
   * - application/json
   * - text/*
   * - *
   */
  defaultResponseBodyParsers: CurlyResponseBodyParsersProperty
}

const create = (defaultOptions: CurlyOptions = {}): CurlyFunction => {
  function curly<ResultData extends any>(
    url: string,
    options: CurlyOptions = {},
  ): Promise<CurlyResult<ResultData>> {
    const curlHandle = new Curl()

    curlHandle.enable(CurlFeature.NoDataParsing)

    curlHandle.setOpt('URL', `${options.curlyBaseUrl || ''}${url}`)

    const finalOptions = {
      ...defaultOptions,
      ...options,
    }

    for (const key of Object.keys(finalOptions)) {
      const keyTyped = key as keyof CurlyOptions

      const optionName: CurlOptionName =
        keyTyped in CurlOptionCamelCaseMap
          ? CurlOptionCamelCaseMap[
              keyTyped as keyof typeof CurlOptionCamelCaseMap
            ]
          : (keyTyped as CurlOptionName)

      // if it begins with curly we do not set it on the curlHandle
      // as it's an specific option for curly
      if (optionName.startsWith('curly')) continue

      // @ts-ignore @TODO Try to type this
      curlHandle.setOpt(optionName, finalOptions[key])
    }

    return new Promise((resolve, reject) => {
      curlHandle.on(
        'end',
        (statusCode, data: Buffer, headers: HeaderInfo[]) => {
          curlHandle.close()

          const lowerCaseHeaders = Object.entries(
            headers[headers.length - 1],
          ).reduce(
            (acc, [k, v]) => ({
              ...acc,
              [k.toLowerCase()]: v,
            }),
            {} as Record<string, string>,
          )
          let contentType = lowerCaseHeaders['content-type'] || ''

          // remove the metadata of the content-type, like charset
          // See https://tools.ietf.org/html/rfc7231#section-3.1.1.5
          contentType = contentType.split(';')[0]

          const responseBodyParsers = {
            ...curly.defaultResponseBodyParsers,
            ...finalOptions.curlyResponseBodyParsers,
          }

          let foundParser = finalOptions.curlyResponseBodyParser

          if (typeof foundParser === 'undefined') {
            for (const [contentTypeFormat, parser] of Object.entries(
              responseBodyParsers,
            )) {
              if (typeof parser !== 'function') {
                return reject(
                  new TypeError(
                    `Response body parser for ${contentTypeFormat} must be a function`,
                  ),
                )
              }
              if (contentType === contentTypeFormat) {
                foundParser = parser
                break
              } else if (contentTypeFormat === '*') {
                foundParser = parser
                break
              } else {
                const partsFormat = contentTypeFormat.split('/')
                const partsContentType = contentType.split('/')

                if (
                  partsContentType.length === partsFormat.length &&
                  partsContentType.every(
                    (val, index) =>
                      partsFormat[index] === '*' || partsFormat[index] === val,
                  )
                ) {
                  foundParser = parser
                  break
                }
              }
            }
          }

          if (foundParser && typeof foundParser !== 'function') {
            return reject(
              new TypeError(
                '`curlyResponseBodyParser` passed to curly must be false or a function.',
              ),
            )
          }

          try {
            resolve({
              statusCode: statusCode,
              data: foundParser ? foundParser(data, headers) : data,
              headers: headers,
            })
          } catch (error) {
            reject(error)
          }
        },
      )

      curlHandle.on('error', (error, errorCode) => {
        curlHandle.close()
        // @ts-ignore
        error.code = errorCode
        reject(error)
      })

      try {
        curlHandle.perform()
      } catch (error) /* istanbul ignore next: this should never happen 🤷‍♂️ */ {
        curlHandle.close()
        reject(error)
      }
    })
  }

  curly.create = create

  curly.defaultResponseBodyParsers = {
    'application/json': (data, _headers) => {
      try {
        const string = data.toString('utf8')
        return JSON.parse(string)
      } catch (error) {
        throw new Error(
          `curly failed to parse "application/json" content as JSON. This is generally caused by receiving malformed JSON data from the server.
You can disable this automatic behavior by setting the option curlyResponseBodyParser to false, then a Buffer will be returned as the data.
You can also overwrite the "application/json" parser with your own by changing one of the following:
  - curly.defaultResponseBodyParsers['application/json']
  or
  - options.curlyResponseBodyParsers = { 'application/json': parser }

If you want just a single function to handle all content-types, you can use the option "curlyResponseBodyParser".
`,
        )
      }
    },
    // We are in [INSERT CURRENT YEAR], let's assume everyone is using utf8 encoding for text/* content-type.
    'text/*': (data, _headers) => data.toString('utf8'),
    // otherwise let's just return the raw buffer
    '*': (data, _headers) => data,
  } as CurlyResponseBodyParsersProperty

  const httpMethodOptionsMap: Record<
    string,
    null | ((m: string, o: CurlyOptions) => CurlyOptions)
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
      customRequest: m.toUpperCase(),
      ...o,
    }),
  }

  for (const httpMethod of methods) {
    const httpMethodOptionsKey = Object.prototype.hasOwnProperty.call(
      httpMethodOptionsMap,
      httpMethod,
    )
      ? httpMethod
      : '_'
    const httpMethodOptions = httpMethodOptionsMap[httpMethodOptionsKey]

    // @ts-ignore
    curly[httpMethod] =
      httpMethodOptions === null
        ? curly
        : (url: string, options: CurlyOptions = {}) =>
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
