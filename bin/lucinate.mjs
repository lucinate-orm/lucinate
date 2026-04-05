#!/usr/bin/env node
/**
 * lucinate CLI — delegates to scripts in scripts/ (generate, migrate, seed).
 * Usage: lucinate make:migration <name> | make:model | make:seeder | migrate | migrate:down | seed
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function scriptPath(name) {
  return join(pkgRoot, 'scripts', name)
}

function runNodeScript(scriptFile, forwardedArgs) {
  const abs = scriptPath(scriptFile)
  if (!existsSync(abs)) {
    console.error(`Missing script: ${abs}`)
    process.exit(1)
  }
  const r = spawnSync(process.execPath, [abs, ...forwardedArgs], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  })
  if (r.error) {
    console.error(r.error)
    process.exit(1)
  }
  process.exit(r.status === null ? (r.signal ? 1 : 0) : r.status)
}

function printHelp() {
  console.log(`
lucinate — lucinate CLI

Commands:
  make:migration <name> [options]   Generate migration; -m, -s, --contents-from (see generate.mjs)
  make:model <Name> [options]       Generate model
  make:seeder <name> [options]      Generate seeder
  migrate [options]                 Run migrations (up)
  migrate:down [options]            Rollback (down)
  seed [options]                    Run seeders

Common options: --app-root, --contents-from (generators), --config, --file / -f (seed), --help

Examples:
  lucinate make:migration create_posts_table --app-root .
  lucinate make:migration create_posts_table -m -s
  lucinate migrate --app-root examples/cli
  lucinate seed --app-root examples/cli
  lucinate seed -f users_seeder_seeder
  lucinate seed --file database/seeders/posts_seeder_seeder

Requires a built package (npm run build in lucinate) to import build/.
`)
}

const argv = process.argv.slice(2)

if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
  printHelp()
  process.exit(0)
}

const cmd = argv[0]
const rest = argv.slice(1)

switch (cmd) {
  case 'make:migration':
    runNodeScript('generate.mjs', ['migration', ...rest])
    break
  case 'make:model':
    runNodeScript('generate.mjs', ['model', ...rest])
    break
  case 'make:seeder':
    runNodeScript('generate.mjs', ['seeder', ...rest])
    break
  case 'migrate':
    runNodeScript('migrate.mjs', rest)
    break
  case 'migrate:down':
    runNodeScript('migrate.mjs', ['--down', ...rest])
    break
  case 'seed':
    runNodeScript('seed.mjs', rest)
    break
  default:
    console.error(`Unknown command: ${cmd}\n`)
    printHelp()
    process.exit(1)
}
