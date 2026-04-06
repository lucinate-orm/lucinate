import type { QueryClientContract } from '../../types/database.js'
import type { LucidModel } from '../../types/model.js'
import type { SideloadedRelations } from './types.js'

export function getCol(model: LucidModel, attributeName: string): string {
  const col = model.$getColumn(attributeName)
  if (!col) {
    throw new Error(`Column "${attributeName}" is not defined on model "${model.name}"`)
  }
  return col.columnName
}

/**
 * Whether the query already has at least one SELECT column (Knex internal).
 */
export function hasSelect(knexQuery: any): boolean {
  const statements = knexQuery._statements as
    | { grouping: string; value: unknown[] }[]
    | undefined
  if (!statements) {
    return false
  }
  return statements.some(
    (obj) => obj && obj.grouping === 'columns' && Array.isArray(obj.value) && obj.value.length > 0,
  )
}

const SIMPLE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Prefixes bare column names in SELECT with `baseTableOrAlias` so they are not ambiguous
 * after `selectRelated` adds JOINs (e.g. `id` → `partners.id`).
 * Only rewrites plain string identifiers; skips `*`, `table.col`, Raw, Ref, subqueries.
 */
export function qualifyBaseSelectColumnsForJoinedRoot(knexQuery: any, baseTableOrAlias: string): void {
  const statements = knexQuery._statements as
    | { grouping: string; value: unknown[] }[]
    | undefined
  if (!statements) {
    return
  }

  for (const stmt of statements) {
    if (stmt.grouping !== 'columns' || !Array.isArray(stmt.value)) {
      continue
    }
    stmt.value = stmt.value.map((col) => qualifyOneSelectColumn(col, baseTableOrAlias))
  }
}

function qualifyOneSelectColumn(col: unknown, base: string): unknown {
  if (typeof col !== 'string') {
    return col
  }
  const trimmed = col.trim()
  if (trimmed === '*' || trimmed.includes('.')) {
    return col
  }
  if (SIMPLE_IDENT.test(trimmed)) {
    return `${base}.${trimmed}`
  }
  const asMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+as\s+(.+)$/i)
  if (asMatch && !asMatch[1].includes('.')) {
    return `${base}.${asMatch[1]} as ${asMatch[2].trim()}`
  }
  return col
}

/**
 * Build `??.?? as ??` selections for sideloaded relations (Adonis-style `_tableAttr` aliases).
 */
export function sideloadColumns(
  query: { knexQuery: any; client: QueryClientContract },
  sideloadedRelations: SideloadedRelations,
  columnMapping: Record<string, string> = {},
): Record<string, string> {
  for (const relationName in sideloadedRelations) {
    const sideloadedRelation = sideloadedRelations[relationName]
    if (!sideloadedRelation) {
      continue
    }

    if (!sideloadedRelation.sideload) {
      if (sideloadedRelation.subRelations) {
        sideloadColumns(query, sideloadedRelation.subRelations, columnMapping)
      }
      continue
    }

    const colPrefix = `_${sideloadedRelation.tableName}`
    const relatedModel = sideloadedRelation.relation.relatedModel() as LucidModel

    relatedModel.$columnsDefinitions.forEach((column, attributeName) => {
      const columnAlias = `${colPrefix}${attributeName}`

      if (columnAlias in columnMapping) {
        throw new Error(`selectRelated: duplicate column alias "${columnAlias}" in query`)
      }

      if (
        Array.isArray(sideloadedRelation.columns) &&
        !sideloadedRelation.columns.includes(attributeName)
      ) {
        return
      }

      columnMapping[columnAlias] = `${sideloadedRelation.tableName}.${column.columnName}`

      query.knexQuery.select(
        query.client.knexRawQuery('??.?? as ??', [
          sideloadedRelation.tableName,
          column.columnName,
          columnAlias,
        ]),
      )
    })

    if (sideloadedRelation.subRelations) {
      sideloadColumns(query, sideloadedRelation.subRelations, columnMapping)
    }
  }

  return columnMapping
}
