// Type definitions for http-basic 0.12.0
// Project: http-basic
// Definitions by: Jonathan Cardoso Machado <https://github.com/JCMais>
import * as express from 'express-serve-static-core'

interface HttpAuthConfig {
  realm?: string
}

interface HttpAuthFunction {}

export function basic(
  config: HttpAuthConfig,
  callback?: (
    username: string,
    password: string,
    callback: (pass: boolean) => void,
  ) => void,
): HttpAuthFunction

export function digest(
  config: HttpAuthConfig,
  callback?: (username: string, callback: (digest?: string) => void) => void,
): HttpAuthFunction
