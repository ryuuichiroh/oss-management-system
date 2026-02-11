/**
 * Version Resolver Module
 *
 * Resolves the previous version to use for SBOM comparison based on:
 * - Configuration file settings
 * - Dependency-Track SBOM availability
 * - First version detection logic
 */
import { ConfigReadResult, VersionResolution } from './types';
/**
 * Check if a value is considered empty
 *
 * @param value - Value to check
 * @returns true if empty (null, undefined, empty string, or whitespace only)
 */
export declare function isEmpty(value: string | null | undefined): boolean;
/**
 * Resolve the previous version to use for comparison
 *
 * @param configResult - Result from config reader
 * @param projectName - Project name for DT lookup
 * @param currentVersion - Current version (Git tag)
 * @returns VersionResolution with version, isFirstVersion, source, and reason
 */
export declare function resolvePreviousVersion(configResult: ConfigReadResult, projectName: string, _currentVersion: string): Promise<VersionResolution>;
//# sourceMappingURL=version-resolver.d.ts.map