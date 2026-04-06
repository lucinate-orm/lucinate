/**
 * Whether `appRoot` has a recognizable DB config marker (`config/database.ts` or resolved build output).
 */
export declare function hasDatabaseConfigMarker(appRoot: string): boolean;
/**
 * Project root for DB resolution — always absolute `cwd` (run CLI from the app root).
 */
export declare function resolveAppRootFromCandidates(cwd: string): string;
//# sourceMappingURL=resolve_app_root.d.ts.map