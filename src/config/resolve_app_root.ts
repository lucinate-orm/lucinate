/*
 * lucinate — app root resolution (aligned with CLI: cwd is the project root).
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { resolveDefaultDatabaseConfigPath } from './load.js'

/**
 * Whether `appRoot` has a recognizable DB config marker (`config/database.ts` or resolved build output).
 */
export function hasDatabaseConfigMarker(appRoot: string): boolean {
  if (resolveDefaultDatabaseConfigPath(appRoot)) {
    return true
  }
  if (existsSync(join(appRoot, 'config', 'database.ts'))) {
    return true
  }
  return false
}

/**
 * Project root for DB resolution — always absolute `cwd` (run CLI from the app root).
 */
export function resolveAppRootFromCandidates(cwd: string): string {
  return resolve(cwd)
}
