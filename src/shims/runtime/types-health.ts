/**
 * Shim for HealthCheckResult (optional health checks).
 */
export type HealthCheckResult = {
  displayName?: string
  health: {
    healthy: boolean
    message: string
  }
  metaData?: Record<string, unknown>
}
