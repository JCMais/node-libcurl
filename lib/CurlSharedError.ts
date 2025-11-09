import { CurlShareCode } from './enum/CurlCode'
import { CurlError } from './CurlError'

export class CurlSharedError extends CurlError {
  static override readonly name = 'CurlSharedError'

  constructor(
    message: string,
    readonly code: CurlShareCode,
    errorOptions?: ErrorOptions,
  ) {
    super(message, errorOptions)
  }
}
