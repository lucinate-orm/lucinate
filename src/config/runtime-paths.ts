/**
 * Config paths are relative to the app root (e.g. `database/migrations`).
 * At runtime Node loads compiled JS under `build/database/migrations`.
 *
 * Unchanged if already under `build/`, absolute, or `../` (e.g. examples).
 */
export function toRuntimeDatabasePath(path: string): string {
  const trimmed = path.trim()
  const p = trimmed.replace(/^\.\//, '')
  if (p.startsWith('build/')) {
    return trimmed.replace(/^\.\//, '') || p
  }
  if (p.startsWith('../')) {
    return path
  }
  if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    return path
  }
  return `build/${p}`
}

export function toRuntimeDatabasePaths(paths: string[] | undefined): string[] {
  if (!paths?.length) {
    return []
  }
  return paths.map(toRuntimeDatabasePath)
}

/**
 * Logical path at app root (e.g. `database/migrations/foo`), without `build/` prefix.
 * Used for names stored in the migrations table and to compare with older history
 * that may still use `build/database/...`.
 */
export function toLogicalDatabasePath(path: string): string {
  let s = path.trim().replace(/\\/g, '/')
  if (s.startsWith('./')) {
    s = s.slice(2)
  }
  if (s.startsWith('build/')) {
    return s.slice('build/'.length)
  }
  return s
}
