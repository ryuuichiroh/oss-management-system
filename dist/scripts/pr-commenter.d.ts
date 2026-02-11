#!/usr/bin/env node
/**
 * PR Commenter
 *
 * Posts SBOM diff information and license guidelines as a comment on a Pull Request.
 *
 * Usage:
 *   node pr-commenter.js <pr-number> <diff-result.json> <artifact-url>
 *
 * Environment Variables:
 *   GITHUB_TOKEN: GitHub API token for authentication
 *   GITHUB_REPOSITORY: Repository in format "owner/repo"
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
import { ComponentDiff, Guideline } from './types';
/**
 * Generate Markdown comment from diff list and guidelines
 */
export declare function generateComment(diffs: ComponentDiff[], guidelinesMap: Map<string, Guideline[]>, sbomArtifactUrl: string): string;
/**
 * Post comment to a Pull Request
 */
export declare function postComment(prNumber: number, comment: string, token: string, repository: string): Promise<void>;
//# sourceMappingURL=pr-commenter.d.ts.map