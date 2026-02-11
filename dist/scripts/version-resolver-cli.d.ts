#!/usr/bin/env node
/**
 * Version Resolver CLI
 *
 * Command-line interface for resolving the previous version to use for SBOM comparison.
 * Reads configuration from the current working directory and determines which version
 * to use based on config file settings and Dependency-Track availability.
 *
 * Usage: node version-resolver-cli.js <project-name> <current-version>
 *
 * Arguments:
 * - project-name: Name of the project in Dependency-Track
 * - current-version: Current version (typically from Git tag)
 *
 * Outputs:
 * - Console: Human-readable resolution information
 * - GITHUB_OUTPUT: Machine-readable outputs for GitHub Actions
 *   - previous_version: The resolved previous version (empty if first version)
 *   - is_first_version: "true" or "false"
 *   - version_source: "config-file", "first-version", or "dt-not-found"
 *
 * Exit codes:
 * - 0: Version resolved successfully
 * - 1: Invalid arguments or resolution failed
 */
export {};
//# sourceMappingURL=version-resolver-cli.d.ts.map