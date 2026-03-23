/*
 * lucinate
 *
 * (c) Harminder Virk
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { pathToFileURL } from 'node:url'
import { type Application } from '../shims/runtime/app.js'

import { toRuntimeDatabasePath } from '../config/runtime-paths.js'
import { type FileNode, type SharedConfigNode } from '../types/database.js'
import { sourceFiles } from '../utils/index.js'

/**
 * Seeders source exposes the API to read the seeders from disk for a given connection.
 */
export class SeedersSource {
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
      this.config.seeders?.naturalSort || false
    )
    return files
  }

  /**
   * Returns an array of seeders paths for a given connection. If paths
   * are not defined, then `database/seeders` fallback is used
   */
  private getSeedersPaths(): string[] {
    const directories = (this.config.seeders || {}).paths
    const defaultDirectory = this.app.relativePath(this.app.seedersPath()) || 'database/seeders'
    const raw =
      directories && directories.length ? directories : [`./${defaultDirectory}`]
    return raw.map((p) => toRuntimeDatabasePath(p))
  }

  /**
   * Returns an array of files for the defined seed directories
   */
  async getSeeders() {
    const seedersPaths = this.getSeedersPaths()
    const directories = await Promise.all(
      seedersPaths.map((directoryPath) => {
        return this.getDirectoryFiles(directoryPath)
      })
    )

    return directories.reduce((result, directory) => {
      result = result.concat(directory)
      return result
    }, [])
  }
}
