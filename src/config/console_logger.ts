/*
 * lucinate — logger de consola para Database (paridade com scripts/lib/console-logger.mjs).
 */
import type { Logger } from '../shims/runtime/logger.js'

export function createConsoleLogger(): Logger {
  const log =
    (level: string) =>
    (obj: unknown, msg?: string, ...args: unknown[]) => {
      const line = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj))
      const fn = level === 'error' || level === 'fatal' ? console.error : console.log
      fn(`[${level}]`, line, ...args)
    }
  const base: Logger = {
    trace: log('trace'),
    debug: log('debug'),
    info: log('info'),
    warn: log('warn'),
    error: log('error'),
    fatal: log('fatal'),
    child() {
      return base
    },
  }
  return base
}
