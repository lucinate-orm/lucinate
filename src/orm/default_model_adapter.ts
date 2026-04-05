/*
 * Optional adapter for contexts without application boot (e.g. seeders via CLI).
 * SeedsRunner sets it before each run; BaseModel uses it on boot if the class has no adapter yet.
 */
import type { AdapterContract } from '../types/model.js'

let fallbackAdapter: AdapterContract | null = null

export function setDefaultModelAdapter(adapter: AdapterContract | null): void {
  fallbackAdapter = adapter
}

export function getDefaultModelAdapter(): AdapterContract | null {
  return fallbackAdapter
}
