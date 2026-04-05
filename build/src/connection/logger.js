/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
/**
 * Knex logger that forwards to the logger injected into the connection.
 */
export class Logger {
    name;
    runtimeLogger;
    warn = function (message) {
        this.runtimeLogger.warn(message);
    }.bind(this);
    error = function (message) {
        this.runtimeLogger.error(message);
    }.bind(this);
    deprecate = function (message) {
        this.runtimeLogger.info(message);
    }.bind(this);
    debug = function (message) {
        this.warn('"debug" property inside config is depreciated. We recommend using "db:query" event for enrich logging');
        this.runtimeLogger.debug(message);
    }.bind(this);
    constructor(name, runtimeLogger) {
        this.name = name;
        this.runtimeLogger = runtimeLogger;
    }
}
//# sourceMappingURL=logger.js.map