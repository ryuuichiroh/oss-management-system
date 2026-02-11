"use strict";
/**
 * Version Resolver Module
 *
 * Resolves the previous version to use for SBOM comparison based on:
 * - Configuration file settings
 * - Dependency-Track SBOM availability
 * - First version detection logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmpty = isEmpty;
exports.resolvePreviousVersion = resolvePreviousVersion;
const dt_client_1 = require("./dt-client");
/**
 * Check if a value is considered empty
 *
 * @param value - Value to check
 * @returns true if empty (null, undefined, empty string, or whitespace only)
 */
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    return false;
}
/**
 * Resolve the previous version to use for comparison
 *
 * @param configResult - Result from config reader
 * @param projectName - Project name for DT lookup
 * @param currentVersion - Current version (Git tag)
 * @returns VersionResolution with version, isFirstVersion, source, and reason
 */
async function resolvePreviousVersion(configResult, projectName, _currentVersion) {
    // Case 1: Config file not found or failed to read
    if (!configResult.success) {
        console.log('[INFO] Treating as first version (reason: config file not found or invalid)');
        return {
            previousVersion: null,
            isFirstVersion: true,
            source: 'first-version',
            reason: 'Config file not found or invalid',
        };
    }
    // Case 2: Config file exists but pre-project-version is missing or empty
    const preProjectVersion = configResult.config?.preProjectVersion;
    if (isEmpty(preProjectVersion)) {
        console.log('[INFO] Treating as first version (reason: pre-project-version is empty)');
        return {
            previousVersion: null,
            isFirstVersion: true,
            source: 'first-version',
            reason: 'pre-project-version is empty',
        };
    }
    // Case 3: Valid pre-project-version exists, check if SBOM exists in DT
    try {
        const sbom = await (0, dt_client_1.getSBOM)(projectName, preProjectVersion);
        if (sbom === null) {
            // SBOM not found in DT
            console.log(`[WARN] SBOM not found in DT for version ${preProjectVersion}`);
            console.log('[INFO] Treating as first version (reason: DT SBOM not found)');
            return {
                previousVersion: null,
                isFirstVersion: true,
                source: 'dt-not-found',
                reason: 'SBOM not found in DT',
            };
        }
        // SBOM found successfully
        console.log(`[INFO] Previous version resolved: ${preProjectVersion} (source: config-file)`);
        return {
            previousVersion: preProjectVersion,
            isFirstVersion: false,
            source: 'config-file',
        };
    }
    catch (error) {
        // DT API error (network error, 5xx, etc.)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ERROR] DT API error: ${errorMessage}`);
        console.log('[INFO] Treating as first version (reason: DT API error)');
        return {
            previousVersion: null,
            isFirstVersion: true,
            source: 'dt-not-found',
            reason: `DT API error: ${errorMessage}`,
        };
    }
}
//# sourceMappingURL=version-resolver.js.map