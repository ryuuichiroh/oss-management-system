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

import { readConfig } from './config-reader';
import { resolvePreviousVersion } from './version-resolver';
import * as fs from 'fs';

async function main() {
  // Parse command-line arguments
  const [projectName, currentVersion] = process.argv.slice(2);
  
  if (!projectName || !currentVersion) {
    console.error('Usage: version-resolver-cli.js <project-name> <current-version>');
    process.exit(1);
  }
  
  // Read config from current working directory
  const repoRoot = process.cwd();
  const configResult = readConfig(repoRoot);
  
  try {
    // Resolve the previous version
    const resolution = await resolvePreviousVersion(
      configResult,
      projectName,
      currentVersion
    );
    
    // Output human-readable information to console
    console.log(`Previous version: ${resolution.previousVersion || '(none)'}`);
    console.log(`Is first version: ${resolution.isFirstVersion}`);
    console.log(`Source: ${resolution.source}`);
    if (resolution.reason) {
      console.log(`Reason: ${resolution.reason}`);
    }
    
    // Set outputs for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `previous_version=${resolution.previousVersion || ''}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `is_first_version=${resolution.isFirstVersion}\n`
      );
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `version_source=${resolution.source}\n`
      );
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
