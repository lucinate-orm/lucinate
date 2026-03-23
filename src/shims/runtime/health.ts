/**
 * Contrato mínimo de health checks (DbCheck / DbConnectionCountCheck).
 */
import type { HealthCheckResult } from './types-health.js'

export abstract class BaseCheck {
  abstract name: string
  abstract run(): Promise<HealthCheckResult>
}

type ResultChain = HealthCheckResult & {
  mergeMetaData(meta: Record<string, unknown>): ResultChain
}

function makeResult(
  health: HealthCheckResult['health'],
  meta: Record<string, unknown> = {}
): ResultChain {
  return {
    health,
    metaData: Object.keys(meta).length ? meta : undefined,
    mergeMetaData(m: Record<string, unknown>) {
      return makeResult(health, { ...meta, ...m })
    },
  }
}

export const Result = {
  ok(message: string) {
    return makeResult({ healthy: true, message })
  },
  failed(message: string, error?: unknown) {
    const meta = error !== undefined ? { error } : {}
    return makeResult({ healthy: false, message }, meta)
  },
  warning(message: string) {
    return makeResult({ healthy: true, message })
  },
}
