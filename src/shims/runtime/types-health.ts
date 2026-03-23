/**
 * Shim para HealthCheckResult (health checks opcionais).
 */
export type HealthCheckResult = {
  displayName?: string
  health: {
    healthy: boolean
    message: string
  }
  metaData?: Record<string, unknown>
}
