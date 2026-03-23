/**
 * EventEmitter / Emitter — compatível com Node e Bun.
 */
import type { EventEmitter } from 'node:events'

export type Emitter<T extends Record<string | symbol, unknown> = Record<string, unknown>> =
  EventEmitter
