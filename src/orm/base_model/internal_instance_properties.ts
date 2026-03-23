/*
 * lucinate
 *
 * Propriedades internas da instância BaseModel — não devem ser
 * sobrescritas via resultado do adapter nem roteadas para $extras no proxy.
 */

export const INTERNAL_INSTANCE_PROPERTIES = new Set<string>([
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
])
