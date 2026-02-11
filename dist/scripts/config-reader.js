"use strict";
/**
 * Config Reader Module
 *
 * Reads and parses the oss-management-system.yml configuration file
 * from the calling repository root.
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
exports.configExists = configExists;
exports.readConfig = readConfig;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const CONFIG_FILE_NAME = 'oss-management-system.yml';
/**
 * Log levels for console output
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (LogLevel = {}));
/**
 * Log a message with the specified level
 *
 * @param level - Log level (INFO, WARN, ERROR)
 * @param message - Message to log
 */
function log(level, message) {
    console.log(`[${level}] ${message}`);
}
/**
 * Check if the config file exists in the repository root
 *
 * @param repoRoot - Root directory of the calling repository
 * @returns true if file exists, false otherwise
 */
function configExists(repoRoot) {
    const configPath = path.join(repoRoot, CONFIG_FILE_NAME);
    try {
        return fs.existsSync(configPath);
    }
    catch (error) {
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
function readConfig(repoRoot) {
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
        const config = {
            preProjectVersion: parsedData['pre-project-version']
        };
        log(LogLevel.INFO, `Config file found: ${configPath}`);
        log(LogLevel.INFO, `pre-project-version: ${config.preProjectVersion || '(not set)'}`);
        return {
            success: true,
            config,
            filePath: configPath
        };
    }
    catch (error) {
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
//# sourceMappingURL=config-reader.js.map