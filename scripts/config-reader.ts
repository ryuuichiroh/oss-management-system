/**
 * Config Reader Module
 * 
 * Reads and parses the oss-management-system.yml configuration file
 * from the calling repository root.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { OSSManagementConfig, ConfigReadResult } from './types';

const CONFIG_FILE_NAME = 'oss-management-system.yml';

/**
 * Log levels for console output
 */
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Log a message with the specified level
 * 
 * @param level - Log level (INFO, WARN, ERROR)
 * @param message - Message to log
 */
function log(level: LogLevel, message: string): void {
  console.log(`[${level}] ${message}`);
}

/**
 * Check if the config file exists in the repository root
 * 
 * @param repoRoot - Root directory of the calling repository
 * @returns true if file exists, false otherwise
 */
export function configExists(repoRoot: string): boolean {
  const configPath = path.join(repoRoot, CONFIG_FILE_NAME);
  try {
    return fs.existsSync(configPath);
  } catch (error) {
    // If we can't check existence, treat as not existing
    return false;
  }
}

/**
 * Read and parse oss-management-system.yml from the calling repository
 * 
 * @param repoRoot - Root directory of the calling repository
 * @returns ConfigReadResult with success/error information
 */
export function readConfig(repoRoot: string): ConfigReadResult {
  const configPath = path.join(repoRoot, CONFIG_FILE_NAME);

  // Check if file exists
  if (!configExists(repoRoot)) {
    log(LogLevel.WARN, `Config file not found: ${configPath}`);
    return {
      success: false,
      error: 'File not found',
      filePath: configPath
    };
  }

  try {
    // Read file content
    const fileContent = fs.readFileSync(configPath, 'utf8');
    
    // Parse YAML
    const parsedData = yaml.load(fileContent);
    
    // Validate that parsed data is an object
    if (typeof parsedData !== 'object' || parsedData === null) {
      log(LogLevel.ERROR, `Failed to parse config file: ${configPath}`);
      log(LogLevel.ERROR, 'Invalid YAML: Expected an object');
      log(LogLevel.ERROR, 'Expected format:');
      log(LogLevel.ERROR, '  pre-project-version: v1.0.0');
      return {
        success: false,
        error: 'Invalid YAML: Expected an object',
        filePath: configPath
      };
    }

    // Extract config with proper typing
    const config: OSSManagementConfig = {
      preProjectVersion: (parsedData as any)['pre-project-version']
    };

    log(LogLevel.INFO, `Config file found: ${configPath}`);
    log(LogLevel.INFO, `pre-project-version: ${config.preProjectVersion || '(not set)'}`);

    return {
      success: true,
      config,
      filePath: configPath
    };
  } catch (error) {
    // Handle parse errors
    if (error instanceof yaml.YAMLException) {
      log(LogLevel.ERROR, `Failed to parse config file: ${configPath}`);
      log(LogLevel.ERROR, `YAML syntax error: ${error.message}`);
      log(LogLevel.ERROR, 'Expected format:');
      log(LogLevel.ERROR, '  pre-project-version: v1.0.0');
      return {
        success: false,
        error: `Invalid YAML: ${error.message}`,
        filePath: configPath
      };
    }
    
    // Handle read errors
    if (error instanceof Error) {
      log(LogLevel.ERROR, `Failed to read config file: ${configPath}`);
      log(LogLevel.ERROR, `Read error: ${error.message}`);
      return {
        success: false,
        error: `Read error: ${error.message}`,
        filePath: configPath
      };
    }

    // Handle unknown errors
    log(LogLevel.ERROR, `Failed to read config file: ${configPath}`);
    log(LogLevel.ERROR, 'Unknown error occurred');
    return {
      success: false,
      error: 'Unknown error occurred',
      filePath: configPath
    };
  }
}
