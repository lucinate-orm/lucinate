import { readFile } from 'node:fs/promises'

/**
 * Replace `{{key}}` placeholders in template with `vars`.
 * @param {string} template
 * @param {Record<string, string>} vars
 */
export function renderStub(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''))
}

/**
 * Read .stub file and render.
 * @param {string} stubPath absolute path
 * @param {Record<string, string>} vars
 */
export async function renderStubFile(stubPath, vars) {
  const raw = await readFile(stubPath, 'utf-8')
  return renderStub(raw, vars)
}
