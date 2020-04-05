import * as express from 'express-serve-static-core'
import { HttpAuthFunction } from 'http-auth'

declare module 'express-serve-static-core' {
  interface Request {
    user?: string
  }
  interface Response {
    user?: string
  }
}

export default function connect(
  func: HttpAuthFunction,
): (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => void
