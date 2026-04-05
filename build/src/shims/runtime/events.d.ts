/**
 * EventEmitter / Emitter — compatible with Node and Bun.
 */
import type { EventEmitter } from 'node:events';
export type Emitter<T extends Record<string | symbol, unknown> = Record<string, unknown>> = EventEmitter;
//# sourceMappingURL=events.d.ts.map