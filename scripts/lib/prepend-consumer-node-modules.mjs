import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

/**
 * O Knex faz `require('mysql2'|'pg'|...)`. Com `lucinate` em `file:` ou layouts
 * Bun/npm, o Node pode não resolver drivers instalados só na app consumidora.
 * Antecede `cwd/node_modules` e `appRoot/node_modules` à lista interna de paths.
 *
 * Sem efeito em Bun (não expõe `module._nodeModulePaths` da mesma forma).
 *
 * @param {string} cwd geralmente process.cwd()
 * @param {string} appRoot raiz da app (resolvida)
 */
export function prependConsumerNodeModulesPaths(cwd, appRoot) {
  if (process.versions.bun) {
    return
  }
  const extra = []
  for (const base of [cwd, appRoot]) {
    const nm = join(base, 'node_modules')
    if (existsSync(nm) && !extra.includes(nm)) {
      extra.push(nm)
    }
  }
  if (extra.length === 0) {
    return
  }
  try {
    const require = createRequire(import.meta.url)
    const Module = require('module')
    const orig = Module._nodeModulePaths
    if (typeof orig !== 'function') {
      return
    }
    Module._nodeModulePaths = function (from) {
      const base = orig.call(this, from)
      const merged = [...extra]
      for (const p of base) {
        if (!merged.includes(p)) {
          merged.push(p)
        }
      }
      return merged
    }
  } catch {
    // ignora se ambiente não suportar patch
  }
}
