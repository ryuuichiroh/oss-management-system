/**
 * Unit Tests for Version Resolver Module
 * 
 * Tests cover:
 * - Valid config with existing DT SBOM
 * - Config file not found
 * - Missing pre-project-version key
 * - Empty pre-project-version value
 * - DT SBOM not found
 * - DT API errors
 * 
 * Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isEmpty, resolvePreviousVersion } from './version-resolver';
import { ConfigReadResult } from './types';
import * as dtClient from './dt-client';

// Mock the dt-client module
vi.mock('./dt-client');

describe('Version Resolver', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset mocks after each test
    vi.resetAllMocks();
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t')).toBe(true);
      expect(isEmpty('\n')).toBe(true);
      expect(isEmpty(' \t\n ')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(isEmpty('v1.0.0')).toBe(false);
      expect(isEmpty('1.0.0')).toBe(false);
      expect(isEmpty(' v1.0.0 ')).toBe(false);
    });
  });

  describe('resolvePreviousVersion - Valid config with existing DT SBOM', () => {
    it('should resolve version from config when SBOM exists in DT', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const mockSBOM = {
        bomFormat: 'CycloneDX' as const,
        specVersion: '1.4',
        version: 1,
        components: []
      };

      vi.mocked(dtClient.getSBOM).mockResolvedValue(mockSBOM);

      // Spy on console.log
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(result.previousVersion).toBe('v1.0.0');
      expect(result.isFirstVersion).toBe(false);
      expect(result.source).toBe('config-file');
      expect(result.reason).toBeUndefined();
      expect(dtClient.getSBOM).toHaveBeenCalledWith('test-project', 'v1.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Previous version resolved: v1.0.0 (source: config-file)');

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should handle numeric version strings', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: '2.5.1'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const mockSBOM = {
        bomFormat: 'CycloneDX' as const,
        specVersion: '1.4',
        version: 1,
        components: []
      };

      vi.mocked(dtClient.getSBOM).mockResolvedValue(mockSBOM);

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        '2.6.0'
      );

      // Assert
      expect(result.previousVersion).toBe('2.5.1');
      expect(result.isFirstVersion).toBe(false);
      expect(result.source).toBe('config-file');
    });

    it('should handle complex version strings with pre-release tags', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0-beta.1'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const mockSBOM = {
        bomFormat: 'CycloneDX' as const,
        specVersion: '1.4',
        version: 1,
        components: []
      };

      vi.mocked(dtClient.getSBOM).mockResolvedValue(mockSBOM);

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBe('v1.0.0-beta.1');
      expect(result.isFirstVersion).toBe(false);
      expect(result.source).toBe('config-file');
    });
  });

  describe('resolvePreviousVersion - Config file not found', () => {
    it('should treat as first version when config read fails', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: false,
        error: 'File not found',
        filePath: '/test/oss-management-system.yml'
      };

      // Spy on console.log
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('Config file not found or invalid');
      expect(dtClient.getSBOM).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Treating as first version (reason: config file not found or invalid)');

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should treat as first version when config has parse error', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: false,
        error: 'Invalid YAML: unexpected token',
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('Config file not found or invalid');
    });
  });

  describe('resolvePreviousVersion - Missing pre-project-version key', () => {
    it('should treat as first version when pre-project-version is undefined', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: undefined
        },
        filePath: '/test/oss-management-system.yml'
      };

      // Spy on console.log
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('pre-project-version is empty');
      expect(dtClient.getSBOM).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Treating as first version (reason: pre-project-version is empty)');

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should treat as first version when config object is missing', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: undefined,
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('pre-project-version is empty');
    });
  });

  describe('resolvePreviousVersion - Empty pre-project-version value', () => {
    it('should treat as first version when pre-project-version is null', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: null
        },
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('pre-project-version is empty');
      expect(dtClient.getSBOM).not.toHaveBeenCalled();
    });

    it('should treat as first version when pre-project-version is empty string', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: ''
        },
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('pre-project-version is empty');
    });

    it('should treat as first version when pre-project-version is whitespace only', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: '   '
        },
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('pre-project-version is empty');
    });

    it('should treat as first version when pre-project-version is tabs and newlines', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: '\t\n\t'
        },
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('first-version');
      expect(result.reason).toBe('pre-project-version is empty');
    });
  });

  describe('resolvePreviousVersion - DT SBOM not found', () => {
    it('should treat as first version when DT returns null (404)', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      vi.mocked(dtClient.getSBOM).mockResolvedValue(null);

      // Spy on console.log
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('dt-not-found');
      expect(result.reason).toBe('SBOM not found in DT');
      expect(dtClient.getSBOM).toHaveBeenCalledWith('test-project', 'v1.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('[WARN] SBOM not found in DT for version v1.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Treating as first version (reason: DT SBOM not found)');

      // Cleanup
      consoleLogSpy.mockRestore();
    });

    it('should treat as first version when SBOM does not exist for specified version', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v0.9.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      vi.mocked(dtClient.getSBOM).mockResolvedValue(null);

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'my-project',
        'v1.0.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('dt-not-found');
      expect(result.reason).toBe('SBOM not found in DT');
    });
  });

  describe('resolvePreviousVersion - DT API errors', () => {
    it('should treat as first version when DT API throws network error', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const networkError = new Error('Network error: ECONNREFUSED');
      vi.mocked(dtClient.getSBOM).mockRejectedValue(networkError);

      // Spy on console.error and console.log
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('dt-not-found');
      expect(result.reason).toBe('DT API error: Network error: ECONNREFUSED');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] DT API error: Network error: ECONNREFUSED');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Treating as first version (reason: DT API error)');

      // Cleanup
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should treat as first version when DT API throws timeout error', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const timeoutError = new Error('Request timeout');
      vi.mocked(dtClient.getSBOM).mockRejectedValue(timeoutError);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('dt-not-found');
      expect(result.reason).toBe('DT API error: Request timeout');

      consoleErrorSpy.mockRestore();
    });

    it('should treat as first version when DT API throws DTClientError', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const dtError = new Error('Failed to get SBOM: Internal Server Error');
      vi.mocked(dtClient.getSBOM).mockRejectedValue(dtError);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('dt-not-found');
      expect(result.reason).toBe('DT API error: Failed to get SBOM: Internal Server Error');

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exceptions from DT API', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      vi.mocked(dtClient.getSBOM).mockRejectedValue('String error');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(result.previousVersion).toBeNull();
      expect(result.isFirstVersion).toBe(true);
      expect(result.source).toBe('dt-not-found');
      expect(result.reason).toBe('DT API error: Unknown error');

      consoleErrorSpy.mockRestore();
    });

    it('should log error to console when DT API fails', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const error = new Error('Connection refused');
      vi.mocked(dtClient.getSBOM).mockRejectedValue(error);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.1.0'
      );

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] DT API error: Connection refused');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Treating as first version (reason: DT API error)');

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('resolvePreviousVersion - Integration scenarios', () => {
    it('should handle different project names correctly', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: 'v1.0.0'
        },
        filePath: '/test/oss-management-system.yml'
      };

      const mockSBOM = {
        bomFormat: 'CycloneDX' as const,
        specVersion: '1.4',
        version: 1,
        components: []
      };

      vi.mocked(dtClient.getSBOM).mockResolvedValue(mockSBOM);

      // Act
      await resolvePreviousVersion(
        configResult,
        'my-special-project',
        'v1.1.0'
      );

      // Assert
      expect(dtClient.getSBOM).toHaveBeenCalledWith('my-special-project', 'v1.0.0');
    });

    it('should not call DT API when config is invalid', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: false,
        error: 'File not found',
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(dtClient.getSBOM).not.toHaveBeenCalled();
    });

    it('should not call DT API when pre-project-version is empty', async () => {
      // Arrange
      const configResult: ConfigReadResult = {
        success: true,
        config: {
          preProjectVersion: ''
        },
        filePath: '/test/oss-management-system.yml'
      };

      // Act
      await resolvePreviousVersion(
        configResult,
        'test-project',
        'v1.0.0'
      );

      // Assert
      expect(dtClient.getSBOM).not.toHaveBeenCalled();
    });
  });
});
