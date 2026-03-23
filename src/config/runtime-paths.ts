/**
 * Paths em config são relativos à raiz da app (ex.: `database/migrations`).
 * Em runtime o Node carrega o JS compilado em `build/database/migrations`.
 *
 * Mantém-se inalterado se já começar por `build/`, for absoluto ou `../` (ex.: examples).
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
 * Caminho lógico na raiz da app (ex.: `database/migrations/foo`), sem prefixo `build/`.
 * Usado para o nome gravado na tabela de migrations e para comparar com histórico antigo
 * que ainda pode ter `build/database/...`.
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
