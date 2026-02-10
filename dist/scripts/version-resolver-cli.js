#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const config_reader_1 = require("./config-reader");
const version_resolver_1 = require("./version-resolver");
const fs = __importStar(require("fs"));
async function main() {
    // Parse command-line arguments
    const [projectName, currentVersion] = process.argv.slice(2);
    if (!projectName || !currentVersion) {
        console.error('Usage: version-resolver-cli.js <project-name> <current-version>');
        process.exit(1);
    }
    // Read config from current working directory
    const repoRoot = process.cwd();
    const configResult = (0, config_reader_1.readConfig)(repoRoot);
    try {
        // Resolve the previous version
        const resolution = await (0, version_resolver_1.resolvePreviousVersion)(configResult, projectName, currentVersion);
        // Output human-readable information to console
        console.log(`Previous version: ${resolution.previousVersion || '(none)'}`);
        console.log(`Is first version: ${resolution.isFirstVersion}`);
        console.log(`Source: ${resolution.source}`);
        if (resolution.reason) {
            console.log(`Reason: ${resolution.reason}`);
        }
        // Set outputs for GitHub Actions
        if (process.env.GITHUB_OUTPUT) {
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `previous_version=${resolution.previousVersion || ''}\n`);
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `is_first_version=${resolution.isFirstVersion}\n`);
            fs.appendFileSync(process.env.GITHUB_OUTPUT, `version_source=${resolution.source}\n`);
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=version-resolver-cli.js.map