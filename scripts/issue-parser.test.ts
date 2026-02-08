/**
 * Unit tests for Issue Parser
 * 
 * Tests parsing of GitHub Issue bodies to extract review results.
 */

import { describe, it, expect } from 'vitest';
import { parseReviewIssue, parseApprovalIssue, parseApprovalRequest } from './issue-parser';

describe('Issue Parser', () => {
  describe('parseReviewIssue', () => {
    it('should parse component information from table', () => {
      const issueBody = `## 🔍 差分一覧とガイドライン

| 変更 | OSS名 | バージョン | ライセンス |
|------|-------|-----------|----------|
| 🆕 | org.example:lib-scanner | 2.1.0 | Apache-2.0 |
| 🔄 | fast-json | 1.4.0 → 1.5.0 | MIT |

### org.example:lib-scanner (Apache-2.0)

#### NOTICEファイルの対応

対応済み

### fast-json (MIT)

#### 著作権表示の確認

- [x] 対応済み

---

- [x] 管理者に承認を依頼する
`;

      const result = parseReviewIssue(issueBody, 'testuser', 'v1.0.0');

      expect(result.version).toBe('v1.0.0');
      expect(result.reviewer).toBe('testuser');
      expect(result.results).toHaveLength(2);

      // Check first component
      expect(result.results[0].component.group).toBe('org.example');
      expect(result.results[0].component.name).toBe('lib-scanner');
      expect(result.results[0].component.version).toBe('2.1.0');
      expect(result.results[0].license).toBe('Apache-2.0');

      // Check second component
      expect(result.results[1].component.name).toBe('fast-json');
      expect(result.results[1].component.version).toBe('1.5.0');
      expect(result.results[1].license).toBe('MIT');
    });

    it('should handle components without group', () => {
      const issueBody = `## 🔍 差分一覧とガイドライン

| 変更 | OSS名 | バージョン | ライセンス |
|------|-------|-----------|----------|
| 🆕 | simple-lib | 1.0.0 | MIT |
`;

      const result = parseReviewIssue(issueBody, 'testuser', 'v1.0.0');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].component.group).toBeUndefined();
      expect(result.results[0].component.name).toBe('simple-lib');
    });

    it('should handle empty issue body', () => {
      const issueBody = '';
      const result = parseReviewIssue(issueBody, 'testuser', 'v1.0.0');

      expect(result.results).toHaveLength(0);
    });
  });

  describe('parseApprovalIssue', () => {
    it('should return true when approval checkbox is checked', () => {
      const issueBody = `## ✅ OSS利用承認タスク

### 承認

- [x] 上記の内容を確認し、Dependency-Trackへの登録を承認します
`;

      const result = parseApprovalIssue(issueBody);
      expect(result).toBe(true);
    });

    it('should return false when approval checkbox is not checked', () => {
      const issueBody = `## ✅ OSS利用承認タスク

### 承認

- [ ] 上記の内容を確認し、Dependency-Trackへの登録を承認します
`;

      const result = parseApprovalIssue(issueBody);
      expect(result).toBe(false);
    });

    it('should return false when approval checkbox is missing', () => {
      const issueBody = `## ✅ OSS利用承認タスク

No checkbox here.
`;

      const result = parseApprovalIssue(issueBody);
      expect(result).toBe(false);
    });
  });

  describe('parseApprovalRequest', () => {
    it('should return true when approval request is checked', () => {
      const issueBody = `
- [x] 管理者に承認を依頼する
`;

      const result = parseApprovalRequest(issueBody);
      expect(result).toBe(true);
    });

    it('should return false when approval request is not checked', () => {
      const issueBody = `
- [ ] 管理者に承認を依頼する
`;

      const result = parseApprovalRequest(issueBody);
      expect(result).toBe(false);
    });
  });
});
