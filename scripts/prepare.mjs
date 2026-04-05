#!/usr/bin/env node
/**
 * Runs after `npm install` (including when lucinate is installed from Git).
 * If TypeScript is present (dev install / full install), use `npm run build`.
 * Otherwise compile with `npx` so consumers do not need `build/` in the repo.
 *
 * Set LUCINATE_SKIP_PREPARE=1 to skip (e.g. lucinate's own CI runs `npm run build` explicitly).
 */
import { spawnSync } from 'node:child_process'

if (process.env.LUCINATE_SKIP_PREPARE === '1') {
  process.exit(0)
}
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const hasLocalTs = existsSync(join(root, 'node_modules', 'typescript', 'package.json'))

if (hasLocalTs) {
  const r = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true })
  process.exit(r.status ?? 1)
}

/** Keep in sync with devDependencies.typescript in package.json */
const TS_VERSION = '5.9.3'

const tsc = spawnSync(
  'npx',
  ['--yes', `typescript@${TS_VERSION}`, 'tsc', '-p', 'tsconfig.json'],
  { cwd: root, stdio: 'inherit', shell: true }
)
if (tsc.status !== 0) process.exit(tsc.status ?? 1)

const assets = spawnSync(process.execPath, [join(root, 'scripts', 'copy-assets.mjs')], {
  cwd: root,
  stdio: 'inherit',
})
process.exit(assets.status ?? 0)
