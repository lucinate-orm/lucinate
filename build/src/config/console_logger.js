export function createConsoleLogger() {
    const log = (level) => (obj, msg, ...args) => {
        const line = msg ?? (typeof obj === 'string' ? obj : JSON.stringify(obj));
        const fn = level === 'error' || level === 'fatal' ? console.error : console.log;
        fn(`[${level}]`, line, ...args);
    };
    const base = {
        trace: log('trace'),
        debug: log('debug'),
        info: log('info'),
        warn: log('warn'),
        error: log('error'),
        fatal: log('fatal'),
        child() {
            return base;
        },
    };
    return base;
}
//# sourceMappingURL=console_logger.js.map