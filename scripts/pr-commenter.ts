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

import * as fs from 'fs';
import * as github from '@actions/github';
import { ComponentDiff, DiffResult, Guideline } from './types';
import { LicenseGuideProvider } from './license-guide-provider';

/**
 * Get the change type emoji
 */
function getChangeEmoji(changeType: string): string {
  switch (changeType) {
    case 'added':
      return '🆕';
    case 'updated':
      return '🔄';
    case 'removed':
      return '🗑️';
    default:
      return '❓';
  }
}

/**
 * Get the license ID from a component
 */
function getLicenseId(diff: ComponentDiff): string {
  const component = diff.component;
  
  if (!component.licenses || component.licenses.length === 0) {
    return 'Unknown';
  }
  
  // Handle SPDX expression
  if (component.licenses[0].expression) {
    return component.licenses[0].expression;
  }
  
  // Handle license object
  if (component.licenses[0].license) {
    return component.licenses[0].license.id || component.licenses[0].license.name || 'Unknown';
  }
  
  return 'Unknown';
}

/**
 * Format version display for the table
 */
function formatVersion(diff: ComponentDiff): string {
  if (diff.changeType === 'updated' && diff.previousVersion) {
    return `${diff.previousVersion} → ${diff.component.version || 'unknown'}`;
  }
  return diff.component.version || 'unknown';
}

/**
 * Escape Markdown special characters
 */
function escapeMarkdown(text: string | undefined): string {
  if (!text) {
    return '';
  }
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

/**
 * Generate Markdown comment from diff list and guidelines
 */
export function generateComment(
  diffs: ComponentDiff[],
  guidelinesMap: Map<string, Guideline[]>,
  sbomArtifactUrl: string
): string {
  const lines: string[] = [];
  
  // Header
  lines.push('## 🔍 OSS差分検出');
  lines.push('');
  lines.push('前回リリースとの差分が検出されました。');
  lines.push('');
  
  // Diff table
  lines.push('### 差分一覧');
  lines.push('');
  lines.push('| 変更 | OSS名 | バージョン | ライセンス |');
  lines.push('|------|-------|-----------|-----------|');
  
  for (const diff of diffs) {
    const emoji = getChangeEmoji(diff.changeType);
    const componentName = escapeMarkdown(diff.component.name);
    const group = diff.component.group ? escapeMarkdown(diff.component.group) : '';
    const fullName = group ? `${group}:${componentName}` : componentName;
    const version = escapeMarkdown(formatVersion(diff));
    const license = escapeMarkdown(getLicenseId(diff));
    
    lines.push(`| ${emoji} | ${fullName} | ${version} | ${license} |`);
  }
  
  lines.push('');
  
  // License guidelines
  if (guidelinesMap.size > 0) {
    lines.push('### ライセンスガイドライン');
    lines.push('');
    
    for (const diff of diffs) {
      const licenseId = getLicenseId(diff);
      const guidelines = guidelinesMap.get(licenseId);
      
      if (guidelines && guidelines.length > 0) {
        const componentName = diff.component.name;
        const group = diff.component.group || '';
        const fullName = group ? `${group}:${componentName}` : componentName;
        
        lines.push(`**${licenseId} (${fullName})**`);
        
        for (const guideline of guidelines) {
          lines.push(`- ${guideline.message}`);
        }
        
        lines.push('');
      }
    }
  }
  
  // Artifact link
  lines.push('---');
  lines.push('');
  lines.push(`📦 [SBOM をダウンロード](${sbomArtifactUrl})`);
  
  return lines.join('\n');
}

/**
 * Post comment to a Pull Request
 */
export async function postComment(
  prNumber: number,
  comment: string,
  token: string,
  repository: string
): Promise<void> {
  const [owner, repo] = repository.split('/');
  
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repository}. Expected "owner/repo"`);
  }
  
  const octokit = github.getOctokit(token);
  
  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: comment
    });
    
    console.log(`Comment posted successfully to PR #${prNumber}`);
  } catch (error) {
    console.error('Failed to post comment to PR:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('Usage: node pr-commenter.js <pr-number> <diff-result.json> <artifact-url>');
    process.exit(1);
  }
  
  const prNumber = parseInt(args[0], 10);
  const diffResultPath = args[1];
  const sbomArtifactUrl = args[2];
  const licenseGuidelinePath = args[3] || 'config/license-guidelines.yml';
  
  if (isNaN(prNumber)) {
    console.error('Invalid PR number');
    process.exit(1);
  }
  
  // Get environment variables
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  
  if (!token) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  if (!repository) {
    console.error('GITHUB_REPOSITORY environment variable is required');
    process.exit(1);
  }
  
  try {
    // Read diff result
    const diffResultContent = fs.readFileSync(diffResultPath, 'utf-8');
    const diffResult: DiffResult = JSON.parse(diffResultContent);
    
    console.log(`Loaded ${diffResult.diffs.length} component differences`);
    
    // If no diffs, post a simple message
    if (diffResult.diffs.length === 0) {
      const comment = '## 🔍 OSS差分検出\n\n前回リリースとの差分はありませんでした。';
      await postComment(prNumber, comment, token, repository);
      console.log('No differences found. Posted simple message.');
      return;
    }
    
    // Load license guidelines
    const guideProvider = new LicenseGuideProvider(licenseGuidelinePath);
    guideProvider.loadConfig();
    
    // Build guidelines map
    const guidelinesMap = new Map<string, Guideline[]>();
    
    for (const diff of diffResult.diffs) {
      const licenseId = getLicenseId(diff);
      
      if (!guidelinesMap.has(licenseId)) {
        const guidelines = guideProvider.getGuidelines(licenseId);
        guidelinesMap.set(licenseId, guidelines);
      }
    }
    
    // Generate comment
    const comment = generateComment(diffResult.diffs, guidelinesMap, sbomArtifactUrl);
    
    // Post comment
    await postComment(prNumber, comment, token, repository);
    
    console.log('PR comment posted successfully');
    
  } catch (error) {
    console.error('Error during PR comment posting:', error);
    process.exit(1);
  }
}

// Run main if executed directly
if (require.main === module) {
  main();
}
