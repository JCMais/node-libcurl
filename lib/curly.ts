/**
 * Copyright (c) Jonathan Cardoso Machado. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Readable } from 'stream'

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
export interface CurlyResult<ResultData = any> {
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

type HttpMethod = (typeof methods)[number]

export type CurlyResponseBodyParser = (
  data: Buffer,
  header: HeaderInfo[],
) => any

export type CurlyResponseBodyParsersProperty = {
  [key: string]: CurlyResponseBodyParser
}

/**
 * These are the options accepted by the {@link CurlyFunction | `CurlyFunction`} API.
 *
 * Most libcurl options are accepted as their specific name, like `PROXY_CAPATH`, or as a camel
 * case version of that name, like `proxyCaPath`.
 *
 * Options specific to the `curly` API are prefixed with `curly`, like `curlyBaseUrl`.
 *
 * For quick navigation use the sidebar.
 */
export interface CurlyOptions extends CurlOptionValueType {
  /**
   * Set this to a callback function that should be used as the progress callback.
   *
   * This is the only reliable way to set the progress callback.
   *
   * @remarks
   *
   * This basically calls one of the following methods, depending on if any of the streams feature is being used or not:
   * - If using streams: {@link "Curl".Curl.setStreamProgressCallback | `Curl#setStreamProgressCallback`}
   * - else:  {@link "Curl".Curl.setProgressCallback | `Curl#setProgressCallback`}
   */
  curlyProgressCallback?: CurlOptionValueType['xferInfoFunction']

  /**
   * If set to a function this will always be called
   * for all requests, ignoring other response body parsers.
   *
   * This can also be set to `false`, which will disable the response parsing and will make
   * the raw `Buffer` of the response to be returned.
   */
  curlyResponseBodyParser?: CurlyResponseBodyParser | false

  /**
   * Add more response body parsers, or overwrite existing ones.
   *
   * This object is merged with the {@link CurlyFunction.defaultResponseBodyParsers | `curly.defaultResponseBodyParsers`}
   */
  curlyResponseBodyParsers?: CurlyResponseBodyParsersProperty

  /**
   * If set, this value will always prefix the `URL` of the request.
   *
   * No special handling is done, so make sure you set the url correctly later on.
   */
  curlyBaseUrl?: string

  /**
   * If `true`, `curly` will lower case all headers before returning then.
   *
   * By default this is `false`.
   */
  curlyLowerCaseHeaders?: boolean

  /**
   * If `true`, `curly` will return the response data as a stream.
   *
   * The `curly` call will resolve as soon as the stream is available.
   *
   * When using this option, if an error is thrown in the internal {@link "Curl".Curl | `Curl`} instance
   * after the `curly` call has been resolved (it resolves as soon as the stream is available)
   * it will cause the `error` event to be emitted on the stream itself, this way it's possible
   * to handle these too, if necessary. The error object will have the property `isCurlError` set to `true`.
   *
   * Calling `destroy()` on the stream will always cause the `Curl` instance to emit the error event.
   * Even if an error argument was not supplied to `stream.destroy()`.
   *
   * By default this is `false`.
   *
   * @remarks
   *
   * Make sure your libcurl version is greater than or equal 7.69.1.
   * Versions older than that one are not reliable for streams usage.
   *
   * This basically enables the {@link CurlFeature.StreamResponse | `CurlFeature.StreamResponse`} feature
   * flag in the internal {@link "Curl".Curl | `Curl`} instance.
   */
  curlyStreamResponse?: boolean

  /**
   * This will set the `hightWaterMark` option in the response stream, if `curlyStreamResponse` is `true`.
   *
   * @remarks
   *
   * This basically calls {@link "Curl".Curl.setStreamResponseHighWaterMark | `Curl#setStreamResponseHighWaterMark`}
   * method in the internal {@link "Curl".Curl | `Curl`} instance.
   */
  curlyStreamResponseHighWaterMark?: number

  /**
   * If set, the contents of this stream will be uploaded to the server.
   *
   * Keep in mind that if you set this option you **SHOULD** not set
   * `progressFunction` or `xferInfoFunction`, as these are used internally.
   *
   * If you need to set a progress callback, use the `curlyProgressCallback` option.
   *
   * If the stream set here is destroyed before libcurl finishes uploading it, the error
   * `Curl upload stream was unexpectedly destroyed` (Code `42`) will be emitted in the
   * internal {@link "Curl".Curl | `Curl`} instance, and so will cause the curly call to be rejected with that error.
   *
   * If the stream was destroyed with a specific error, this error will be passed instead.
   *
   * By default this is not set.
   *
   * @remarks
   *
   * Make sure your libcurl version is greater than or equal 7.69.1.
   * Versions older than that one are not reliable for streams usage.
   *
   * This basically calls {@link "Curl".Curl.setUploadStream | `Curl#setUploadStream`}
   * method in the internal {@link "Curl".Curl | `Curl`} instance.
   */
  curlyStreamUpload?: Readable | null
}

interface CurlyHttpMethodCall {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class.
   *
   * The `curly.<field>` being used will be the HTTP verb sent.
   *
   * @typeParam ResultData You can use this to specify the type of the `data` property returned from this call.
   */
  <ResultData = any>(
    url: string,
    options?: CurlyOptions,
  ): Promise<CurlyResult<ResultData>>
}

// type HttpMethodCalls = { readonly [K in HttpMethod]: CurlyHttpMethodCall }
type HttpMethodCalls = Record<HttpMethod, CurlyHttpMethodCall>

export interface CurlyFunction extends HttpMethodCalls {
  /**
   * **EXPERIMENTAL** This API can change between minor releases
   *
   * Async wrapper around the Curl class.
   *
   * It's also possible to request using a specific http verb
   *  directly by using `curl.<http-verb>(url: string, options?: CurlyOptions)`, like:
   *
   * ```js
   * curly.get('https://www.google.com')
   * ```
   * @typeParam ResultData You can use this to specify the type of the `data` property returned from this call.
   */
  <ResultData = any>(
    url: string,
    options?: CurlyOptions,
  ): Promise<CurlyResult<ResultData>>

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
  function curly<ResultData>(
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

    // streams!
    const {
      curlyStreamResponse,
      curlyStreamResponseHighWaterMark,
      curlyStreamUpload,
    } = finalOptions
    const isUsingStream = !!(curlyStreamResponse || curlyStreamUpload)

    if (finalOptions.curlyProgressCallback) {
      if (typeof finalOptions.curlyProgressCallback !== 'function') {
        throw new TypeError(
          'curlyProgressCallback must be a function with signature (number, number, number, number) => number',
        )
      }

      const fnToCall = isUsingStream
        ? 'setStreamProgressCallback'
        : 'setProgressCallback'

      curlHandle[fnToCall](finalOptions.curlyProgressCallback)
    }

    if (curlyStreamResponse) {
      curlHandle.enable(CurlFeature.StreamResponse)

      if (curlyStreamResponseHighWaterMark) {
        curlHandle.setStreamResponseHighWaterMark(
          curlyStreamResponseHighWaterMark,
        )
      }
    }

    if (curlyStreamUpload) {
      curlHandle.setUploadStream(curlyStreamUpload)
    }

    const lowerCaseHeadersIfNecessary = (headers: HeaderInfo[]) => {
      // in-place modification
      // yeah, I know mutability is bad and all that
      if (finalOptions.curlyLowerCaseHeaders) {
        for (const headersReq of headers) {
          const entries = Object.entries(headersReq)
          for (const [headerKey, headerValue] of entries) {
            delete headersReq[headerKey]
            // @ts-expect-error ignoring this for now
            headersReq[headerKey.toLowerCase()] = headerValue
          }
        }
      }
    }

    return new Promise((resolve, reject) => {
      let stream: Readable

      if (curlyStreamResponse) {
        curlHandle.on(
          'stream',
          (_stream, statusCode, headers: HeaderInfo[]) => {
            lowerCaseHeadersIfNecessary(headers)

            stream = _stream

            resolve({
              // @ts-ignore cannot be subtype yada yada
              data: stream,
              statusCode,
              headers,
            })
          },
        )
      }

      curlHandle.on(
        'end',
        (statusCode, data: Buffer, headers: HeaderInfo[]) => {
          curlHandle.close()

          // only need to the remaining here if we did not enabled
          // the stream response
          if (curlyStreamResponse) {
            return
          }

          const contentTypeEntry = Object.entries(
            headers[headers.length - 1],
          ).find(([k]) => k.toLowerCase() === 'content-type')

          let contentType = (
            contentTypeEntry ? contentTypeEntry[1] : ''
          ) as string

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

          lowerCaseHeadersIfNecessary(headers)

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
        // @ts-ignore
        error.isCurlError = true

        // oops, if have a stream it means the promise
        // has been resolved with it
        // so instead of rejecting the original promise
        // we are emitting the error event on the stream
        if (stream) {
          stream.emit('error', error)
        } else {
          reject(error)
        }
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
