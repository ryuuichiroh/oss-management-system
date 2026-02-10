#!/usr/bin/env node
"use strict";
/**
 * Config Reader CLI
 *
 * Command-line interface for reading and displaying the oss-management-system.yml
 * configuration file from the current working directory.
 *
 * Usage: node config-reader-cli.js
 *
 * Exit codes:
 * - 0: Config file found and parsed successfully
 * - 1: Config file not found or parsing failed
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config_reader_1 = require("./config-reader");
function main() {
    // Read config from current working directory
    const repoRoot = process.cwd();
    const result = (0, config_reader_1.readConfig)(repoRoot);
    if (result.success) {
        // Success case: output config information
        console.log(`✓ Config file found: ${result.filePath}`);
        console.log(`  pre-project-version: ${result.config?.preProjectVersion || '(not set)'}`);
        process.exit(0);
    }
    else {
        // Error case: output error information
        console.log(`✗ Config file error: ${result.error}`);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=config-reader-cli.js.map