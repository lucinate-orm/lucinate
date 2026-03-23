import { mkdir, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'src/clients/libsql.cjs')
const dest = join(root, 'build/src/clients/libsql.cjs')

await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
