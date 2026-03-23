import { join, resolve } from 'node:path'
import { hasDatabaseConfigMarker } from './default-config-path.mjs'

/**
 * Quando `--app-root` e `APP_ROOT` não estão definidos, usa o primeiro diretório
 * (por ordem) onde existir config de BD na raiz da app (`config/database.*` ou
 * `build/config/database.js`; legado: `src/config/database.ts`):
 * `./` (cwd), `./src`, `./app` — relativos a `cwd`.
 *
 * @param {string} cwd process.cwd() ou equivalente
 * @returns {string} caminho absoluto da raiz da app
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
