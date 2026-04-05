export class BaseCheck {
}
function makeResult(health, meta = {}) {
    return {
        health,
        metaData: Object.keys(meta).length ? meta : undefined,
        mergeMetaData(m) {
            return makeResult(health, { ...meta, ...m });
        },
    };
}
export const Result = {
    ok(message) {
        return makeResult({ healthy: true, message });
    },
    failed(message, error) {
        const meta = error !== undefined ? { error } : {};
        return makeResult({ healthy: false, message }, meta);
    },
    warning(message) {
        return makeResult({ healthy: true, message });
    },
};
//# sourceMappingURL=health.js.map