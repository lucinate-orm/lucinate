import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** lucinate package root (directory containing `build/`). */
export function getPackageRoot(fromImportMetaUrl) {
  return dirname(dirname(fileURLToPath(fromImportMetaUrl)))
}

export function entryIndexJs(packageRoot) {
  return join(packageRoot, 'build', 'index.js')
}
