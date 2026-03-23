/*
 * lucinate — resolução da raiz da app (paridade com scripts/lib/resolve-app-root.mjs).
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { resolveDefaultDatabaseConfigPath } from './load.js'

/**
 * Indica se em `appRoot` existe um marcador reconhecível de config de BD.
 */
export function hasDatabaseConfigMarker(appRoot: string): boolean {
  if (resolveDefaultDatabaseConfigPath(appRoot)) {
    return true
  }
  if (existsSync(join(appRoot, 'config', 'database.ts'))) {
    return true
  }
  if (existsSync(join(appRoot, 'src', 'config', 'database.ts'))) {
    return true
  }
  return false
}

/**
 * Escolhe a primeira base (`cwd`, `cwd/src`, `cwd/app`) onde exista config de BD; senão `cwd` absoluto.
 */
export function resolveAppRootFromCandidates(cwd: string): string {
  const bases = [cwd, join(cwd, 'src'), join(cwd, 'app')]
  for (const base of bases) {
    const abs = resolve(base)
    if (hasDatabaseConfigMarker(abs)) {
      return abs
    }
  }
  return resolve(cwd)
}
