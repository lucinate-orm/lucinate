/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { pathToFileURL } from 'node:url'
import type { Application } from '../shims/runtime/app.js'
import { toLogicalDatabasePath, toRuntimeDatabasePath } from '../config/runtime-paths.js'
import { sourceFiles } from '../utils/index.js'
import { type SharedConfigNode, type FileNode } from '../types/database.js'

/**
 * Migration source exposes the API to read the migration files
 * from disk for a given connection.
 */
export class MigrationSource {
  constructor(
    private config: SharedConfigNode,
    private app: Application<any>
  ) {}

  /**
   * Returns an array of files inside a given directory. Relative
   * paths are resolved from the project root
   */
  private async getDirectoryFiles(directoryPath: string): Promise<FileNode<unknown>[]> {
    const root = this.app.appRoot
    const fromLocation =
      typeof root === 'string'
        ? pathToFileURL(root.endsWith('/') ? root : `${root}/`)
        : (root as URL)

    const { files } = await sourceFiles(
      fromLocation,
      directoryPath,
      this.config.migrations?.naturalSort || false
    )

    return files
  }

  /**
   * Returns an array of migrations paths for a given connection. If paths
   * are not defined, then `database/migrations` fallback is used
   */
  getMigrationsPaths(): string[] {
    const directories = (this.config.migrations || {}).paths
    const defaultDirectory =
      this.app.relativePath(this.app.migrationsPath()) || 'database/migrations'
    const raw =
      directories && directories.length ? directories : [`./${defaultDirectory}`]
    return raw.map((p) => toRuntimeDatabasePath(p))
  }

  /**
   * Returns an array of files for all defined directories
   */
  async getMigrations() {
    const migrationPaths = this.getMigrationsPaths()
    const directories = await Promise.all(
      migrationPaths.map((directoryPath) => {
        return this.getDirectoryFiles(directoryPath)
      })
    )

    const flat = directories.reduce((result, directory) => {
      result = result.concat(directory)
      return result
    }, [] as FileNode<unknown>[])

    return flat.map((file) => ({
      ...file,
      name: toLogicalDatabasePath(file.name),
    }))
  }
}
