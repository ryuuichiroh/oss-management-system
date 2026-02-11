/**
 * Tests for Issue Creator
 */

import { describe, it, expect } from 'vitest';
import {
  generateReviewIssueMarkdown,
  generateApprovalIssue
} from './issue-creator';
import { ComponentDiff, Guideline, ReviewResult } from './types';

describe('Issue Creator', () => {
  describe('generateReviewIssueMarkdown', () => {
    it('should generate valid markdown for review issue', () => {
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
      guidelinesMap.set('Apache-2.0', guidelines);
      
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      // Should contain markdown headers and content
      expect(result).toContain('## 🔍 差分一覧とガイドライン');
      expect(result).toContain('| 変更 | OSS名 | バージョン | ライセンス |');
      expect(result).toContain('org.example:test-lib');
      expect(result).toContain('Apache-2.0');
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
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      // Should contain table with components
      expect(result).toContain('new-lib');
      expect(result).toContain('updated-lib');
      expect(result).toContain('2.5.0 → 3.0.0');
      expect(result).toContain('🆕');
      expect(result).toContain('🔄');
    });

    it('should include common check items', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [];
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      expect(result).toContain('### ✅ 共通チェック事項');
      expect(result).toContain('- [ ] すべての新規OSSについて、ライセンス種別に誤りがないことを確認した');
      expect(result).toContain('- [ ] 意図しないバージョンアップが含まれていないことを確認した');
    });

    it('should include approval request checkbox', () => {
      const version = 'v1.0.0';
      const diffs: ComponentDiff[] = [];
      const guidelinesMap = new Map<string, Guideline[]>();
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      expect(result).toContain('### 承認依頼');
      expect(result).toContain('- [ ] 管理者に承認を依頼する');
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
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      expect(result).toContain('no-group-lib');
      expect(result).not.toContain(':no-group-lib');
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
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      // Pipes should be escaped
      expect(result).toContain('lib\\|with\\|pipes');
    });

    it('should generate sections based on guideline types', () => {
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
          message: 'Checkbox test message',
          inputType: 'checkbox',
          label: 'Checkbox Label'
        },
        {
          condition: 'always',
          message: 'Text test message',
          inputType: 'text',
          label: 'Text Label'
        },
        {
          condition: 'always',
          message: 'Select test message',
          inputType: 'select',
          label: 'Select Label',
          options: ['Option 1', 'Option 2']
        }
      ];
      
      const guidelinesMap = new Map<string, Guideline[]>();
      guidelinesMap.set('Apache-2.0', guidelines);
      
      const sbomUrl = 'https://example.com/sbom.json';
      
      const result = generateReviewIssueMarkdown(diffs, guidelinesMap, sbomUrl);
      
      // Should have sections for each guideline type
      expect(result).toContain('#### Checkbox Label');
      expect(result).toContain('Checkbox test message');
      expect(result).toContain('- [ ] 対応済み');
      
      expect(result).toContain('#### Text Label');
      expect(result).toContain('Text test message');
      expect(result).toContain('<!-- INPUT_START -->');
      expect(result).toContain('_対応内容を記入してください_');
      expect(result).toContain('<!-- INPUT_END -->');
      
      expect(result).toContain('#### Select Label');
      expect(result).toContain('Select test message');
      expect(result).toContain('Option 1');
      expect(result).toContain('Option 2');
      expect(result).toContain('_選択した内容を記入してください_');
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
