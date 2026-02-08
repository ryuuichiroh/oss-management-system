/**
 * Unit tests for PR Commenter
 */

import { describe, it, expect } from 'vitest';
import { generateComment } from './pr-commenter';
import { ComponentDiff, Guideline } from './types';

describe('PR Commenter', () => {
  it('should generate comment with diff table', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'added',
        component: {
          type: 'library',
          group: 'org.example',
          name: 'lib-scanner',
          version: '2.1.0',
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

    const guidelinesMap = new Map<string, Guideline[]>();
    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('## 🔍 OSS差分検出');
    expect(comment).toContain('### 差分一覧');
    expect(comment).toContain('lib-scanner');
    expect(comment).toContain('2.1.0');
    expect(comment).toContain('Apache-2.0');
    expect(comment).toContain('📦 [SBOM をダウンロード](https://example.com/artifact)');
  });

  it('should include license guidelines in comment', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'added',
        component: {
          type: 'library',
          name: 'test-lib',
          version: '1.0.0',
          licenses: [
            {
              license: {
                id: 'MIT'
              }
            }
          ]
        }
      }
    ];

    const guidelinesMap = new Map<string, Guideline[]>();
    guidelinesMap.set('MIT', [
      {
        condition: 'always',
        message: '著作権表示とライセンステキストを保持してください。',
        inputType: 'checkbox',
        label: 'ライセンステキストの保持'
      }
    ]);

    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('### ライセンスガイドライン');
    expect(comment).toContain('**MIT (test-lib)**');
    expect(comment).toContain('著作権表示とライセンステキストを保持してください。');
  });

  it('should handle updated components with version change', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'updated',
        component: {
          type: 'library',
          name: 'fast-json',
          version: '1.5.0',
          licenses: [
            {
              license: {
                id: 'MIT'
              }
            }
          ]
        },
        previousVersion: '1.4.0'
      }
    ];

    const guidelinesMap = new Map<string, Guideline[]>();
    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('1.4.0 → 1.5.0');
    expect(comment).toContain('🔄');
  });

  it('should handle components without group', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'added',
        component: {
          type: 'library',
          name: 'simple-lib',
          version: '1.0.0',
          licenses: [
            {
              license: {
                id: 'MIT'
              }
            }
          ]
        }
      }
    ];

    const guidelinesMap = new Map<string, Guideline[]>();
    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('simple-lib');
    expect(comment).not.toContain(':simple-lib');
  });

  it('should escape markdown special characters', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'added',
        component: {
          type: 'library',
          name: 'lib|with|pipes',
          version: '1.0.0',
          licenses: [
            {
              license: {
                id: 'MIT'
              }
            }
          ]
        }
      }
    ];

    const guidelinesMap = new Map<string, Guideline[]>();
    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('lib\\|with\\|pipes');
  });

  it('should handle components with SPDX expression', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'added',
        component: {
          type: 'library',
          name: 'dual-license-lib',
          version: '1.0.0',
          licenses: [
            {
              expression: 'MIT OR Apache-2.0'
            }
          ]
        }
      }
    ];

    const guidelinesMap = new Map<string, Guideline[]>();
    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('MIT OR Apache-2.0');
  });

  it('should handle components without licenses', () => {
    const diffs: ComponentDiff[] = [
      {
        changeType: 'added',
        component: {
          type: 'library',
          name: 'no-license-lib',
          version: '1.0.0'
        }
      }
    ];

    const guidelinesMap = new Map<string, Guideline[]>();
    const artifactUrl = 'https://example.com/artifact';

    const comment = generateComment(diffs, guidelinesMap, artifactUrl);

    expect(comment).toContain('Unknown');
  });
});
