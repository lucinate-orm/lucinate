import type { Knex } from 'knex'

declare module 'knex' {
  namespace Knex {
    interface CreateTableBuilder {
      softDeletes(columnName?: string): ColumnBuilder
      ulid(columnName?: string): ColumnBuilder
      uuid(columnName?: string): ColumnBuilder
      morphs(name: string, indexName?: string, after?: string): void
      nullableMorphs(name: string, indexName?: string, after?: string): void
      numericMorphs(name: string, indexName?: string, after?: string): void
      nullableNumericMorphs(name: string, indexName?: string, after?: string): void
      uuidMorphs(name: string, indexName?: string, after?: string): void
      nullableUuidMorphs(name: string, indexName?: string, after?: string): void
      ulidMorphs(name: string, indexName?: string, after?: string): void
      nullableUlidMorphs(name: string, indexName?: string, after?: string): void
    }
  }
}
