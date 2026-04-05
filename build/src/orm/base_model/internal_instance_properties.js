/*
 * lucinate
 *
 * Internal BaseModel instance properties — must not be
 * overwritten from adapter results or routed to $extras in the proxy.
 */
export const INTERNAL_INSTANCE_PROPERTIES = new Set([
    '$columns',
    '$attributes',
    '$original',
    '$preloaded',
    '$extras',
    '$sideloaded',
    '$isPersisted',
    '$isDeleted',
    '$isLocal',
    'modelOptions',
    'modelTrx',
    'transactionListener',
    'fillInvoked',
    'cachedGetters',
    'forceUpdate',
]);
//# sourceMappingURL=internal_instance_properties.js.map