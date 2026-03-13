import { CurlMultiCode } from './enum/CurlCode'
import { CurlError } from './CurlError'

export class CurlMultiError extends CurlError {
  static override readonly name = 'CurlMultiError'

  constructor(
    message: string,
    readonly code: CurlMultiCode,
    errorOptions?: ErrorOptions,
  ) {
    super(message, errorOptions)
  }
}
