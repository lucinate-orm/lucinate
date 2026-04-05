import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

/**
 * Knex uses `require('mysql2'|'pg'|...)`. With `lucinate` linked via `file:` or certain
 * Bun/npm layouts, Node may not resolve drivers installed only in the consumer app.
 * Prepends `cwd/node_modules` and `appRoot/node_modules` to the internal path list.
 *
 * No effect on Bun (does not expose `module._nodeModulePaths` the same way).
 *
 * @param {string} cwd usually process.cwd()
 * @param {string} appRoot resolved app root
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
    // ignore if environment does not support patching
  }
}
