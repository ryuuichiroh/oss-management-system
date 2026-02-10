/**
 * Unit Tests for Config Reader Module
 * 
 * Tests cover:
 * - File exists scenario
 * - File not found scenario
 * - Invalid YAML scenario
 * - Missing key scenario
 * - Empty value scenarios (null, undefined, "", whitespace)
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { configExists, readConfig } from './config-reader';

describe('Config Reader', () => {
  const testDir = path.join(__dirname, 'test-data', 'config-reader-tests');
  const configFileName = 'oss-management-system.yml';

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir);
      files.forEach(file => {
        const filePath = path.join(testDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
      fs.rmdirSync(testDir);
    }
  });

  describe('configExists', () => {
    it('should return true when config file exists', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: v1.0.0');

      // Act
      const result = configExists(testDir);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when config file does not exist', () => {
      // Act
      const result = configExists(testDir);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('readConfig - File exists scenario', () => {
    it('should successfully read valid config with pre-project-version', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: v1.0.0');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBe('v1.0.0');
      expect(result.filePath).toBe(configPath);
      expect(result.error).toBeUndefined();
    });

    it('should successfully read config with numeric version', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: 1.0.0');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config?.preProjectVersion).toBe('1.0.0');
    });

    it('should successfully read config with complex version string', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: v2.1.3-beta.1');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config?.preProjectVersion).toBe('v2.1.3-beta.1');
    });
  });

  describe('readConfig - File not found scenario', () => {
    it('should return error when config file does not exist', () => {
      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
      expect(result.config).toBeUndefined();
      expect(result.filePath).toBe(path.join(testDir, configFileName));
    });

    it('should return error when directory does not exist', () => {
      // Arrange
      const nonExistentDir = path.join(testDir, 'non-existent');

      // Act
      const result = readConfig(nonExistentDir);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('readConfig - Invalid YAML scenario', () => {
    it('should return error for invalid YAML syntax', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'invalid: yaml: content: [[[');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid YAML');
      expect(result.config).toBeUndefined();
    });

    it('should return error for malformed YAML with unclosed brackets', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: [v1.0.0');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid YAML');
    });

    it('should return error for YAML that is not an object', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'just a string');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid YAML: Expected an object');
    });

    it('should handle YAML array as valid but extract undefined preProjectVersion', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, '- item1\n- item2');

      // Act
      const result = readConfig(testDir);

      // Assert
      // YAML arrays are parsed as objects by js-yaml, so this succeeds
      // but preProjectVersion will be undefined since the key doesn't exist
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeUndefined();
    });
  });

  describe('readConfig - Missing key scenario', () => {
    it('should succeed but have undefined preProjectVersion when key is missing', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'other-key: some-value');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeUndefined();
    });

    it('should succeed with empty config object', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, '{}');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeUndefined();
    });

    it('should return error for file with only comments (no valid YAML object)', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, '# This is a comment\n# Another comment');

      // Act
      const result = readConfig(testDir);

      // Assert
      // A file with only comments results in null from yaml.load, which fails the object check
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid YAML: Expected an object');
    });
  });

  describe('readConfig - Empty value scenarios', () => {
    it('should handle null value for pre-project-version', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: null');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeNull();
    });

    it('should handle empty string for pre-project-version', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: ""');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBe('');
    });

    it('should handle whitespace-only string for pre-project-version', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: "   "');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBe('   ');
    });

    it('should handle tab and newline whitespace for pre-project-version', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: " \\t\\n "');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeDefined();
    });

    it('should handle tilde (~) which represents null in YAML', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version: ~');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeNull();
    });

    it('should handle no value after colon (implicit null)', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, 'pre-project-version:');

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.preProjectVersion).toBeNull();
    });
  });

  describe('readConfig - Additional edge cases', () => {
    it('should handle config with multiple keys', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, `
pre-project-version: v1.0.0
other-config: value
another-key: 123
`);

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config?.preProjectVersion).toBe('v1.0.0');
    });

    it('should handle config with comments', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, `
# Configuration for OSS Management System
pre-project-version: v1.0.0  # Previous version
`);

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config?.preProjectVersion).toBe('v1.0.0');
    });

    it('should handle config with nested structures', () => {
      // Arrange
      const configPath = path.join(testDir, configFileName);
      fs.writeFileSync(configPath, `
pre-project-version: v1.0.0
nested:
  key: value
  another: 123
`);

      // Act
      const result = readConfig(testDir);

      // Assert
      expect(result.success).toBe(true);
      expect(result.config?.preProjectVersion).toBe('v1.0.0');
    });
  });
});
