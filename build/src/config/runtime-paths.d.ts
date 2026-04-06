/**
 * Config paths are relative to the app root (e.g. `database/migrations`).
 * At runtime Node loads compiled JS under `build/database/migrations`.
 *
 * Unchanged if already under `build/`, absolute, or `../` (e.g. examples).
 */
export declare function toRuntimeDatabasePath(path: string): string;
export declare function toRuntimeDatabasePaths(paths: string[] | undefined): string[];
/**
 * Logical path at app root (e.g. `database/migrations/foo`), without `build/` prefix.
 * Used for names stored in the migrations table and to compare with older history
 * that may still use `build/database/...`.
 */
export declare function toLogicalDatabasePath(path: string): string;
//# sourceMappingURL=runtime-paths.d.ts.map