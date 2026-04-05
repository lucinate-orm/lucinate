import { join, resolve } from 'node:path'
import { hasDatabaseConfigMarker } from './default-config-path.mjs'

/**
 * When `--app-root` and `APP_ROOT` are unset, uses the first directory (in order) where
 * DB config exists at the app root (`config/database.*` or
 * `build/config/database.js`; legacy: `src/config/database.ts`):
 * `./` (cwd), `./src`, `./app` — relative to `cwd`.
 *
 * @param {string} cwd process.cwd() or equivalent
 * @returns {string} absolute app root path
 */
export function resolveAppRootFromCandidates(cwd) {
  const bases = [cwd, join(cwd, 'src'), join(cwd, 'app')]
  for (const base of bases) {
    const abs = resolve(base)
    if (hasDatabaseConfigMarker(abs)) {
      return abs
    }
  }
  return resolve(cwd)
}
