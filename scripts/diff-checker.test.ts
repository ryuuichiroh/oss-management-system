/**
 * Unit tests for SBOM Diff Checker
 * 
 * Tests the diff checker functionality including first version scenario handling.
 */

import { describe, it, expect } from 'vitest';
import { compareSBOMs } from './diff-checker';
import { SBOM, ComponentDiff } from './types';

describe('SBOM Diff Checker', () => {
  describe('First Version Scenario (Requirements 4.1, 4.2, 4.3)', () => {
    it('should mark all components as "added" when comparing against empty SBOM', () => {
      // Arrange: Create a current SBOM with components
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          {
            type: 'library',
            group: 'org.apache.logging.log4j',
            name: 'log4j-core',
            version: '2.14.1',
            licenses: [{ license: { id: 'Apache-2.0' } }]
          },
          {
            type: 'library',
            group: 'com.fasterxml.jackson.core',
            name: 'jackson-databind',
            version: '2.12.0',
            licenses: [{ license: { id: 'Apache-2.0' } }]
          },
          {
            type: 'library',
            name: 'fast-json',
            version: '1.5.0',
            licenses: [{ license: { id: 'MIT' } }]
          }
        ]
      };

      // Arrange: Create an empty previous SBOM (first version scenario)
      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: []
      };

      // Act: Compare the SBOMs
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert: All components should be marked as "added"
      expect(diffs).toHaveLength(3);
      expect(diffs.every(diff => diff.changeType === 'added')).toBe(true);
      
      // Assert: No components should be marked as "removed"
      expect(diffs.filter(diff => diff.changeType === 'removed')).toHaveLength(0);
      
      // Assert: No components should be marked as "updated"
      expect(diffs.filter(diff => diff.changeType === 'updated')).toHaveLength(0);
      
      // Assert: All current components should be in the diff result
      const diffComponentNames = diffs.map(d => d.component.name).sort();
      const currentComponentNames = currentSbom.components.map(c => c.name).sort();
      expect(diffComponentNames).toEqual(currentComponentNames);
    });

    it('should handle empty current SBOM against empty previous SBOM', () => {
      // Arrange: Both SBOMs are empty
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: []
      };

      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: []
      };

      // Act: Compare the SBOMs
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert: No differences should be found
      expect(diffs).toHaveLength(0);
    });

    it('should mark all components as "added" when previous SBOM has no components', () => {
      // Arrange: Current SBOM with one component
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          {
            type: 'library',
            name: 'single-component',
            version: '1.0.0'
          }
        ]
      };

      // Arrange: Previous SBOM with no components
      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: []
      };

      // Act: Compare the SBOMs
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert: Single component should be marked as "added"
      expect(diffs).toHaveLength(1);
      expect(diffs[0].changeType).toBe('added');
      expect(diffs[0].component.name).toBe('single-component');
    });
  });

  describe('Normal Diff Scenarios', () => {
    it('should detect added components', () => {
      // Arrange
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 2,
        components: [
          {
            type: 'library',
            name: 'existing-lib',
            version: '1.0.0'
          },
          {
            type: 'library',
            name: 'new-lib',
            version: '2.0.0'
          }
        ]
      };

      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          {
            type: 'library',
            name: 'existing-lib',
            version: '1.0.0'
          }
        ]
      };

      // Act
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert
      expect(diffs).toHaveLength(1);
      expect(diffs[0].changeType).toBe('added');
      expect(diffs[0].component.name).toBe('new-lib');
    });

    it('should detect updated components', () => {
      // Arrange
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 2,
        components: [
          {
            type: 'library',
            name: 'updated-lib',
            version: '2.0.0'
          }
        ]
      };

      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          {
            type: 'library',
            name: 'updated-lib',
            version: '1.0.0'
          }
        ]
      };

      // Act
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert
      expect(diffs).toHaveLength(1);
      expect(diffs[0].changeType).toBe('updated');
      expect(diffs[0].component.name).toBe('updated-lib');
      expect(diffs[0].component.version).toBe('2.0.0');
      expect(diffs[0].previousVersion).toBe('1.0.0');
    });

    it('should detect removed components', () => {
      // Arrange
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 2,
        components: []
      };

      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: [
          {
            type: 'library',
            name: 'removed-lib',
            version: '1.0.0'
          }
        ]
      };

      // Act
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert
      expect(diffs).toHaveLength(1);
      expect(diffs[0].changeType).toBe('removed');
      expect(diffs[0].component.name).toBe('removed-lib');
    });

    it('should handle components with groups correctly', () => {
      // Arrange
      const currentSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 2,
        components: [
          {
            type: 'library',
            group: 'com.example',
            name: 'lib-a',
            version: '1.0.0'
          },
          {
            type: 'library',
            group: 'org.example',
            name: 'lib-a',
            version: '1.0.0'
          }
        ]
      };

      const previousSbom: SBOM = {
        bomFormat: 'CycloneDX',
        specVersion: '1.4',
        version: 1,
        components: []
      };

      // Act
      const diffs = compareSBOMs(currentSbom, previousSbom);

      // Assert: Both components should be added (different groups)
      expect(diffs).toHaveLength(2);
      expect(diffs.every(diff => diff.changeType === 'added')).toBe(true);
    });
  });
});
