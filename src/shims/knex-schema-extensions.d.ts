import type { Knex } from 'knex'

declare module 'knex' {
  namespace Knex {
    interface CreateTableBuilder {
      softDeletes(columnName?: string): ColumnBuilder
      ulid(columnName?: string): ColumnBuilder
      uuid(columnName?: string): ColumnBuilder
    }
  }
}
