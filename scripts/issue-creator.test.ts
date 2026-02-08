/**
 * Tests for Issue Creator
 */

import { describe, it, expect } from 'vitest';
import * as yaml from 'js-yaml';
import {
  generateReviewIssueForm,
  generateApprovalIssue
} from './issue-creator';
import { ComponentDiff, Guideline, ReviewResult, Component } from './types';

describe('Issue Creator', () => {
  describe('generateReviewIssueForm', () => {
    it('should generate valid YAML for review issue form', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [
        {
          changeType: 'added',
          component: {
            type: 'library',
            group: 'org.example',
            name: 'test-lib',
            version: '1.0.0',
            licenses: [
              {
                license: {
                  id: 'Apache-2.0'
                }
              }
            ]
          }
        }
      ];
      
      const guidelines: Guideline[] = [
        {
          condition: 'always',
          message: 'Test guideline message',
          inputType: 'checkbox',
          label: 'Test Label'
        }
      ];
      
      const guidelinesMap = new Map<string, Guideline[]>();
      guidelinesMap.set('org.example:test-lib', guidelines);
      
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      
      // Should be valid YAML
      expect(() => yaml.load(result)).not.toThrow();
      
      // Parse and verify structure
      const parsed: any = yaml.load(result);
      expect(parsed.name).toBe('OSS利用見直しタスク');
      expect(parsed.title).toContain(version);
      expect(parsed.labels).toContain('oss-review');
      expect(Array.isArray(parsed.body)).toBe(true);
      expect(parsed.body.length).toBeGreaterThan(0);
    });

    it('should include component diff table in markdown', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [
        {
          changeType: 'added',
          component: {
            type: 'library',
            name: 'new-lib',
            version: '2.0.0',
            licenses: [{ license: { id: 'MIT' } }]
          }
        },
        {
          changeType: 'updated',
          component: {
            type: 'library',
            name: 'updated-lib',
            version: '3.0.0',
            licenses: [{ license: { id: 'Apache-2.0' } }]
          },
          previousVersion: '2.5.0'
        }
      ];
      
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      const parsed: any = yaml.load(result);
      
      // Find the markdown section with the table
      const tableSection = parsed.body.find((item: any) => 
        item.type === 'markdown' && item.attributes.value.includes('| 変更 |')
      );
      
      expect(tableSection).toBeDefined();
      expect(tableSection.attributes.value).toContain('new-lib');
      expect(tableSection.attributes.value).toContain('updated-lib');
      expect(tableSection.attributes.value).toContain('2.5.0 → 3.0.0');
    });

    it('should include common check items', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [];
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      const parsed: any = yaml.load(result);
      
      const commonChecks = parsed.body.find((item: any) => item.id === 'common-checks');
      expect(commonChecks).toBeDefined();
      expect(commonChecks.type).toBe('checkboxes');
      expect(commonChecks.attributes.options.length).toBeGreaterThan(0);
    });

    it('should include approval request checkbox', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [];
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      const parsed: any = yaml.load(result);
      
      const approvalRequest = parsed.body.find((item: any) => item.id === 'approval-request');
      expect(approvalRequest).toBeDefined();
      expect(approvalRequest.type).toBe('checkboxes');
      expect(approvalRequest.attributes.label).toContain('承認依頼');
    });

    it('should handle components without group field', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [
        {
          changeType: 'added',
          component: {
            type: 'library',
            name: 'no-group-lib',
            version: '1.0.0',
            licenses: [{ license: { id: 'MIT' } }]
          }
        }
      ];
      
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      
      expect(() => yaml.load(result)).not.toThrow();
      expect(result).toContain('no-group-lib');
    });

    it('should escape special characters in markdown table', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [
        {
          changeType: 'added',
          component: {
            type: 'library',
            name: 'lib|with|pipes',
            version: '1.0.0',
            licenses: [{ license: { id: 'MIT' } }]
          }
        }
      ];
      
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      
      // Pipes should be escaped
      expect(result).toContain('lib\\|with\\|pipes');
    });

    it('should generate input fields based on guideline types', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [
        {
          changeType: 'added',
          component: {
            type: 'library',
            name: 'test-lib',
            version: '1.0.0',
            licenses: [{ license: { id: 'Apache-2.0' } }]
          }
        }
      ];
      
      const guidelines: Guideline[] = [
        {
          condition: 'always',
          message: 'Checkbox test',
          inputType: 'checkbox',
          label: 'Checkbox Label'
        },
        {
          condition: 'always',
          message: 'Text test',
          inputType: 'text',
          label: 'Text Label'
        },
        {
          condition: 'always',
          message: 'Select test',
          inputType: 'select',
          label: 'Select Label',
          options: ['Option 1', 'Option 2']
        }
      ];
      
      const guidelinesMap = new Map<string, Guideline[]>();
      guidelinesMap.set(':test-lib', guidelines);
      
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      const parsed: any = yaml.load(result);
      
      // Should have checkbox, input, and dropdown fields
      const hasCheckbox = parsed.body.some((item: any) => item.type === 'checkboxes' && item.attributes.label === 'Checkbox Label');
      const hasInput = parsed.body.some((item: any) => item.type === 'input' && item.attributes.label === 'Text Label');
      const hasDropdown = parsed.body.some((item: any) => item.type === 'dropdown' && item.attributes.label === 'Select Label');
      
      expect(hasCheckbox).toBe(true);
      expect(hasInput).toBe(true);
      expect(hasDropdown).toBe(true);
    });
  });

  describe('generateApprovalIssue', () => {
    it('should generate valid markdown for approval issue', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [
        {
          component: {
            type: 'library',
            name: 'test-lib',
            version: '1.0.0'
          },
          license: 'Apache-2.0',
          actions: {
            'NOTICEファイルの対応': '対応済み'
          }
        }
      ];
      
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      expect(result).toContain('OSS利用承認タスク');
      expect(result).toContain(version);
      expect(result).toContain('test-lib');
      expect(result).toContain('Apache-2.0');
    });

    it('should include review results table', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [
        {
          component: {
            type: 'library',
            group: 'org.example',
            name: 'lib1',
            version: '1.0.0'
          },
          license: 'MIT',
          actions: {
            'Action 1': 'Value 1'
          }
        },
        {
          component: {
            type: 'library',
            name: 'lib2',
            version: '2.0.0'
          },
          license: 'Apache-2.0',
          actions: {}
        }
      ];
      
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      expect(result).toContain('| OSS名 | バージョン | ライセンス | 対応状況 |');
      expect(result).toContain('org.example:lib1');
      expect(result).toContain('lib2');
      expect(result).toContain('1件の対応');
      expect(result).toContain('対応なし');
    });

    it('should include detailed review results', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [
        {
          component: {
            type: 'library',
            name: 'test-lib',
            version: '1.0.0'
          },
          license: 'MIT',
          actions: {
            'Label 1': 'Value 1',
            'Label 2': 'Value 2'
          }
        }
      ];
      
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      expect(result).toContain('詳細な見直し結果');
      expect(result).toContain('Label 1');
      expect(result).toContain('Value 1');
      expect(result).toContain('Label 2');
      expect(result).toContain('Value 2');
    });

    it('should include artifact links', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [];
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      expect(result).toContain(sbomUrl);
      expect(result).toContain(reviewJsonUrl);
      expect(result).toContain('SBOM をダウンロード');
      expect(result).toContain('見直し結果JSON をダウンロード');
    });

    it('should include approval checkbox', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [];
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      expect(result).toContain('- [ ]');
      expect(result).toContain('承認');
      expect(result).toContain('Dependency-Track');
    });

    it('should handle empty review results', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [];
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      expect(result).toContain('OSS利用承認タスク');
      expect(result).toContain(version);
    });

    it('should escape special characters in markdown', () => {
      const version = 'v1.0.0';
      const reviewResults: ReviewResult[] = [
        {
          component: {
            type: 'library',
            name: 'lib|with|pipes',
            version: '1.0.0'
          },
          license: 'MIT',
          actions: {
            'Label|with|pipes': 'Value|with|pipes'
          }
        }
      ];
      
      const sbomUrl = 'https://example.com/sbom.json';
      const reviewJsonUrl = 'https://example.com/review.json';
      
      const result = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      // Pipes should be escaped in table
      expect(result).toContain('lib\\|with\\|pipes');
    });
  });
});
