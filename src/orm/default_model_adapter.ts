/*
 * Adapter opcional para contextos sem boot de aplicação (ex.: seeders via CLI).
 * SeedsRunner define-o antes de cada run; BaseModel usa-o no boot se a classe ainda não tiver adapter.
 */
import type { AdapterContract } from '../types/model.js'

let fallbackAdapter: AdapterContract | null = null

export function setDefaultModelAdapter(adapter: AdapterContract | null): void {
  fallbackAdapter = adapter
}

export function getDefaultModelAdapter(): AdapterContract | null {
  return fallbackAdapter
}
