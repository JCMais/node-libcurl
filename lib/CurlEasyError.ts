import { CurlCode } from './enum/CurlCode'
import { CurlError } from './CurlError'

export class CurlEasyError extends CurlError {
  static override readonly name = 'CurlEasyError'

  constructor(
    message: string,
    readonly code: CurlCode,
    errorOptions?: ErrorOptions,
  ) {
    super(message, errorOptions)
  }
}
