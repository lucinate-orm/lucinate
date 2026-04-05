/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Logger as PinoLogger } from '../shims/runtime/logger.js'

/**
 * Knex logger that forwards to the logger injected into the connection.
 */
export class Logger {
  warn = function (this: Logger, message: any) {
    this.runtimeLogger.warn(message)
  }.bind(this)

  error = function (this: Logger, message: any) {
    this.runtimeLogger.error(message)
  }.bind(this)

  deprecate = function (this: Logger, message: any) {
    this.runtimeLogger.info(message)
  }.bind(this)

  debug = function (this: Logger, message: any) {
    this.warn(
      '"debug" property inside config is depreciated. We recommend using "db:query" event for enrich logging'
    )
    this.runtimeLogger.debug(message)
  }.bind(this)

  constructor(
    public name: string,
    public runtimeLogger: PinoLogger
  ) {}
}
