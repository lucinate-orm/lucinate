import { resolve } from 'node:path'

/**
 * Preferência: LUCINATE_CONFIG_PATH; compat: LUCINATE_DATABASE_CONFIG.
 * @returns {string | null} caminho absoluto ou null
 */
export function resolveConfigPathFromEnv() {
  const v = process.env.LUCINATE_CONFIG_PATH || process.env.LUCINATE_DATABASE_CONFIG
  return v ? resolve(v) : null
}
