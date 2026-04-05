/*
 * lucinate
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AssertionError } from 'node:assert'
import type { Database } from '../database/main.js'
import type { LucidRow, LucidModel } from '../types/model.js'

/**
 * Database assertions for tests (framework-agnostic). Pass a `Database`
 * instance from `bootDatabase()` or your app wiring.
 */
export class DatabaseTestAssertions {
  constructor(
    protected db: Database,
    protected connectionName?: string
  ) {}

  /**
   * Scope assertions to another connection name.
   */
  connection(connectionName: string) {
    return new DatabaseTestAssertions(this.db, connectionName)
  }

  async #getClient() {
    return this.db.connection(this.connectionName)
  }

  /**
   * Assert that the given table has rows matching the provided data.
   * When `count` is provided, asserts that exactly that many matching rows exist.
   */
  async assertHas(table: string, data: Record<string, any>, count?: number) {
    const client = await this.#getClient()
    const result: any = await client.query().from(table).where(data).count('* as count')
    const actualCount = Number(result[0].count)

    if (count !== undefined && actualCount !== count) {
      throw new AssertionError({
        message: `Expected table '${table}' to have ${count} rows matching ${JSON.stringify(data)}, but found ${actualCount}`,
        actual: actualCount,
        expected: count,
        operator: 'assertHas',
      })
    }

    if (count === undefined && actualCount === 0) {
      throw new AssertionError({
        message: `Expected table '${table}' to have rows matching ${JSON.stringify(data)}, but none were found`,
        actual: 0,
        expected: '>= 1',
        operator: 'assertHas',
      })
    }
  }

  /**
   * Assert that the given table has no rows matching the provided data.
   */
  async assertMissing(table: string, data: Record<string, any>) {
    const client = await this.#getClient()
    const result: any = await client.query().from(table).where(data).count('* as count')
    const actualCount = Number(result[0].count)

    if (actualCount > 0) {
      throw new AssertionError({
        message: `Expected table '${table}' to have no rows matching ${JSON.stringify(data)}, but found ${actualCount}`,
        actual: actualCount,
        expected: 0,
        operator: 'assertMissing',
      })
    }
  }

  /**
   * Assert that the given table has exactly the expected number of rows.
   */
  async assertCount(table: string, expectedCount: number) {
    const client = await this.#getClient()
    const result: any = await client.query().from(table).count('* as count')
    const actualCount = Number(result[0].count)

    if (actualCount !== expectedCount) {
      throw new AssertionError({
        message: `Expected table '${table}' to have ${expectedCount} rows, but found ${actualCount}`,
        actual: actualCount,
        expected: expectedCount,
        operator: 'assertCount',
      })
    }
  }

  /**
   * Assert that the given table is empty (has no rows).
   */
  async assertEmpty(table: string) {
    return this.assertCount(table, 0)
  }

  /**
   * Assert that a model instance exists in the database.
   */
  async assertModelExists(model: LucidRow) {
    const Model = model.constructor as LucidModel
    const primaryKeyValue = model.$primaryKeyValue

    if (primaryKeyValue === undefined) {
      throw new Error(`Cannot assert model existence: primary key value is undefined`)
    }

    const result = await Model.find(primaryKeyValue, { connection: this.connectionName })

    if (!result) {
      throw new AssertionError({
        message: `Expected '${Model.name}' model with primary key ${primaryKeyValue} to exist, but it was not found`,
        actual: 'missing',
        expected: 'exists',
        operator: 'assertModelExists',
      })
    }
  }

  /**
   * Assert that a model instance does not exist in the database.
   */
  async assertModelMissing(model: LucidRow) {
    const Model = model.constructor as LucidModel
    const primaryKeyValue = model.$primaryKeyValue

    if (primaryKeyValue === undefined) {
      throw new Error(`Cannot assert model absence: primary key value is undefined`)
    }

    const result = await Model.find(primaryKeyValue, { connection: this.connectionName })

    if (result) {
      throw new AssertionError({
        message: `Expected '${Model.name}' model with primary key ${primaryKeyValue} to not exist, but it was found`,
        actual: 'exists',
        expected: 'missing',
        operator: 'assertModelMissing',
      })
    }
  }
}
