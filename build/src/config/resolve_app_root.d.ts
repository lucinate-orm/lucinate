/**
 * Whether `appRoot` has a recognizable DB config marker.
 */
export declare function hasDatabaseConfigMarker(appRoot: string): boolean;
/**
 * Pick the first base (`cwd`, `cwd/src`, `cwd/app`) where DB config exists; otherwise absolute `cwd`.
 */
export declare function resolveAppRootFromCandidates(cwd: string): string;
//# sourceMappingURL=resolve_app_root.d.ts.map