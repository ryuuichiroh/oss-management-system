#!/usr/bin/env node
/**
 * Issue Creator
 *
 * Creates GitHub Issues for OSS review and approval workflows.
 * - Review Issue: YAML form with component diffs and license guidelines
 * - Approval Issue: Markdown with review results
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3, 6.4
 */
import { ComponentDiff, Guideline, ReviewResult } from './types';
/**
 * Generate Review Issue (Markdown)
 */
export declare function generateReviewIssueMarkdown(diffs: ComponentDiff[], guidelinesMap: Map<string, Guideline[]>, sbomArtifactUrl: string): string;
/**
 * Generate Approval Issue (Markdown)
 */
export declare function generateApprovalIssue(version: string, reviewResults: ReviewResult[], sbomArtifactUrl: string, reviewResultsArtifactUrl: string): string;
/**
 * Create a GitHub Issue using the GitHub API
 */
export declare function createGitHubIssue(title: string, body: string, labels: string[], assignees?: string[]): Promise<number>;
//# sourceMappingURL=issue-creator.d.ts.map