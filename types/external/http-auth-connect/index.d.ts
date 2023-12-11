import * as express from 'express'
import 'express-serve-static-core'
import { HttpAuthFunction } from 'http-auth'

declare module 'express-serve-static-core' {
  interface Request {
    user?: string
  }
  interface Response {
    user?: string
  }
}

export default function connect(func: HttpAuthFunction): express.RequestHandler
