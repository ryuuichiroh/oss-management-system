/**
 * Config Reader Module
 *
 * Reads and parses the oss-management-system.yml configuration file
 * from the calling repository root.
 */
import { ConfigReadResult } from './types';
/**
 * Check if the config file exists in the repository root
 *
 * @param repoRoot - Root directory of the calling repository
 * @returns true if file exists, false otherwise
 */
export declare function configExists(repoRoot: string): boolean;
/**
 * Read and parse oss-management-system.yml from the calling repository
 *
 * @param repoRoot - Root directory of the calling repository
 * @returns ConfigReadResult with success/error information
 */
export declare function readConfig(repoRoot: string): ConfigReadResult;
//# sourceMappingURL=config-reader.d.ts.map