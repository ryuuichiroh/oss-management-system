#!/usr/bin/env node
/**
 * Issue Parser
 *
 * Parses GitHub Issue bodies to extract review results.
 * Supports both Review Issues (YAML form output) and Approval Issues (Markdown).
 *
 * Requirements: 8.1, 8.2, 8.4
 */
import { ReviewResultsDocument } from './types';
/**
 * Parse review results from a Review Issue body
 */
export declare function parseReviewIssue(issueBody: string, reviewer: string, version: string): ReviewResultsDocument;
/**
 * Parse approval checkbox state from Approval Issue body
 */
export declare function parseApprovalIssue(issueBody: string): boolean;
/**
 * Parse approval request checkbox from Review Issue body
 */
export declare function parseApprovalRequest(issueBody: string): boolean;
//# sourceMappingURL=issue-parser.d.ts.map