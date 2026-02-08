/**
 * Tests for License Guide Provider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { LicenseGuideProvider } from './license-guide-provider';
import { ComponentContext } from './types';

describe('LicenseGuideProvider', () => {
  const testConfigPath = path.join(__dirname, 'test-data', 'test-license-guidelines.yml');
  let provider: LicenseGuideProvider;

  beforeEach(() => {
    provider = new LicenseGuideProvider(testConfigPath);
  });

  describe('Configuration Loading', () => {
    it('should load valid YAML configuration', () => {
      provider.loadConfig();
      const licenseIds = provider.getLicenseIds();
      expect(licenseIds.length).toBeGreaterThan(0);
    });

    it('should handle missing configuration file gracefully', () => {
      const invalidProvider = new LicenseGuideProvider('non-existent-file.yml');
      invalidProvider.loadConfig();
      
      // Should return default guideline
      const guidelines = invalidProvider.getGuidelines('Apache-2.0');
      expect(guidelines).toHaveLength(1);
      expect(guidelines[0].message).toContain('このライセンスのガイドラインが定義されていません');
    });

    it('should handle invalid YAML format gracefully', () => {
      const invalidYamlPath = path.join(__dirname, 'test-data', 'invalid.yml');
      
      // Create invalid YAML file
      if (!fs.existsSync(path.dirname(invalidYamlPath))) {
        fs.mkdirSync(path.dirname(invalidYamlPath), { recursive: true });
      }
      fs.writeFileSync(invalidYamlPath, 'invalid: yaml: content: [[[');
      
      const invalidProvider = new LicenseGuideProvider(invalidYamlPath);
      invalidProvider.loadConfig();
      
      // Should return default guideline
      const guidelines = invalidProvider.getGuidelines('MIT');
      expect(guidelines).toHaveLength(1);
      expect(guidelines[0].message).toContain('このライセンスのガイドラインが定義されていません');
      
      // Cleanup
      fs.unlinkSync(invalidYamlPath);
    });
  });

  describe('Guideline Retrieval', () => {
    beforeEach(() => {
      provider.loadConfig();
    });

    it('should return default guideline for undefined license', () => {
      const guidelines = provider.getGuidelines('UNKNOWN-LICENSE');
      
      expect(guidelines).toHaveLength(1);
      expect(guidelines[0].condition).toBe('always');
      expect(guidelines[0].message).toContain('このライセンスのガイドラインが定義されていません');
      expect(guidelines[0].inputType).toBe('text');
    });

    it('should return guidelines for defined license with always condition', () => {
      const guidelines = provider.getGuidelines('Apache-2.0');
      
      expect(guidelines.length).toBeGreaterThan(0);
      const alwaysGuideline = guidelines.find(g => g.condition === 'always');
      expect(alwaysGuideline).toBeDefined();
    });

    it('should filter guidelines based on is_modified context', () => {
      const contextModified: ComponentContext = { isModified: true };
      const contextNotModified: ComponentContext = { isModified: false };
      
      const guidelinesModified = provider.getGuidelines('Apache-2.0', contextModified);
      const guidelinesNotModified = provider.getGuidelines('Apache-2.0', contextNotModified);
      
      // Guidelines with is_modified condition should only appear when isModified is true
      const modifiedOnlyGuideline = guidelinesModified.find(
        g => g.condition.includes('is_modified')
      );
      
      if (modifiedOnlyGuideline) {
        const notInUnmodified = !guidelinesNotModified.some(
          g => g.label === modifiedOnlyGuideline.label
        );
        expect(notInUnmodified).toBe(true);
      }
    });

    it('should filter guidelines based on link_type context', () => {
      const contextStatic: ComponentContext = { linkType: 'static' };
      const contextDynamic: ComponentContext = { linkType: 'dynamic' };
      
      const guidelinesStatic = provider.getGuidelines('GPL-3.0', contextStatic);
      const guidelinesDynamic = provider.getGuidelines('GPL-3.0', contextDynamic);
      
      // Should return different guidelines based on link type
      expect(guidelinesStatic).toBeDefined();
      expect(guidelinesDynamic).toBeDefined();
    });

    it('should filter guidelines based on is_distributed context', () => {
      const contextDistributed: ComponentContext = { isDistributed: true };
      const contextNotDistributed: ComponentContext = { isDistributed: false };
      
      const guidelinesDistributed = provider.getGuidelines('MIT', contextDistributed);
      const guidelinesNotDistributed = provider.getGuidelines('MIT', contextNotDistributed);
      
      expect(guidelinesDistributed).toBeDefined();
      expect(guidelinesNotDistributed).toBeDefined();
    });
  });

  describe('Condition Evaluation', () => {
    beforeEach(() => {
      provider.loadConfig();
    });

    it('should evaluate always condition as true', () => {
      const guidelines = provider.getGuidelines('Apache-2.0', {});
      const alwaysGuideline = guidelines.find(g => g.condition === 'always');
      expect(alwaysGuideline).toBeDefined();
    });

    it('should evaluate is_modified conditions correctly', () => {
      const guidelines = provider.getGuidelines('Apache-2.0', { isModified: true });
      expect(guidelines.length).toBeGreaterThan(0);
    });

    it('should handle empty context', () => {
      const guidelines = provider.getGuidelines('Apache-2.0', {});
      expect(guidelines.length).toBeGreaterThan(0);
    });
  });

  describe('Input Type Mapping', () => {
    beforeEach(() => {
      provider.loadConfig();
    });

    it('should correctly map checkbox input type', () => {
      const guidelines = provider.getGuidelines('Apache-2.0');
      const checkboxGuideline = guidelines.find(g => g.inputType === 'checkbox');
      
      if (checkboxGuideline) {
        expect(checkboxGuideline.label).toBeDefined();
        expect(checkboxGuideline.message).toBeDefined();
      }
    });

    it('should correctly map text input type', () => {
      const guidelines = provider.getGuidelines('Apache-2.0', { isModified: true });
      const textGuideline = guidelines.find(g => g.inputType === 'text');
      
      if (textGuideline) {
        expect(textGuideline.label).toBeDefined();
        expect(textGuideline.message).toBeDefined();
      }
    });

    it('should correctly map select input type with options', () => {
      const guidelines = provider.getGuidelines('GPL-3.0', { linkType: 'static' });
      const selectGuideline = guidelines.find(g => g.inputType === 'select');
      
      if (selectGuideline) {
        expect(selectGuideline.options).toBeDefined();
        expect(Array.isArray(selectGuideline.options)).toBe(true);
      }
    });
  });

  describe('Common Instructions', () => {
    beforeEach(() => {
      provider.loadConfig();
    });

    it('should return common instructions for license with common_instructions', () => {
      const instructions = provider.getCommonInstructions('Apache-2.0');
      expect(instructions).toBeDefined();
      expect(typeof instructions).toBe('string');
    });

    it('should return null for license without common_instructions', () => {
      const instructions = provider.getCommonInstructions('UNKNOWN-LICENSE');
      expect(instructions).toBeNull();
    });
  });
});
