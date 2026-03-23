import { readFile } from 'node:fs/promises'

/**
 * Substitui `{{chave}}` no template pelos valores em `vars`.
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function renderStub(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''))
}

/**
 * Lê ficheiro .stub e renderiza.
 * @param {string} stubPath caminho absoluto
 * @param {Record<string, string>} vars
 */
export async function renderStubFile(stubPath, vars) {
  const raw = await readFile(stubPath, 'utf-8')
  return renderStub(raw, vars)
}
