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

import * as fs from 'fs';
import * as github from '@actions/github';
import * as yaml from 'js-yaml';
import {
  ComponentDiff,
  Guideline,
  ReviewResult,
  Component
} from './types';

/**
 * Get the primary license ID from a component
 */
function getLicenseId(component: Component): string {
  if (!component.licenses || component.licenses.length === 0) {
    return 'Unknown';
  }

  const firstLicense = component.licenses[0];
  
  // Check for SPDX expression first
  if (firstLicense.expression) {
    return firstLicense.expression;
  }
  
  // Check for license ID
  if (firstLicense.license?.id) {
    return firstLicense.license.id;
  }
  
  // Check for license name
  if (firstLicense.license?.name) {
    return firstLicense.license.name;
  }
  
  return 'Unknown';
}

/**
 * Escape special characters for Markdown
 */
function escapeMarkdown(text: string | undefined | null): string {
  if (text === undefined || text === null) {
    return '';
  }
  return text
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '');
}

/**
 * Generate change type emoji
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
 * Generate Review Issue Form (YAML)
 */
export function generateReviewIssueForm(
  version: string,
  diffs: ComponentDiff[],
  guidelinesMap: Map<string, Guideline[]>,
  sbomArtifactUrl: string
): string {
  const issueForm: any = {
    name: 'OSS利用見直しタスク',
    description: 'リリース前のOSS利用見直し',
    title: `[Review] OSS利用見直し ${version}`,
    labels: ['oss-review'],
    body: []
  };

  // Add header markdown
  issueForm.body.push({
    type: 'markdown',
    attributes: {
      value: `## 🔍 差分一覧とガイドライン\n\n前回リリースとの差分が検出されました。以下の内容を確認してください。`
    }
  });

  // Add component diff table
  let tableMarkdown = '\n| 変更 | OSS名 | バージョン | ライセンス |\n';
  tableMarkdown += '|------|-------|-----------|----------|\n';
  
  for (const diff of diffs) {
    const emoji = getChangeEmoji(diff.changeType);
    const componentName = escapeMarkdown(diff.component.name);
    const group = diff.component.group ? escapeMarkdown(diff.component.group) : '';
    const fullName = group ? `${group}:${componentName}` : componentName;
    
    let versionDisplay = escapeMarkdown(diff.component.version);
    if (diff.changeType === 'updated' && diff.previousVersion) {
      versionDisplay = `${escapeMarkdown(diff.previousVersion)} → ${versionDisplay}`;
    }
    
    const licenseId = escapeMarkdown(getLicenseId(diff.component));
    
    tableMarkdown += `| ${emoji} | ${fullName} | ${versionDisplay} | ${licenseId} |\n`;
  }

  issueForm.body.push({
    type: 'markdown',
    attributes: {
      value: tableMarkdown
    }
  });

  // Add common checks
  issueForm.body.push({
    type: 'checkboxes',
    id: 'common-checks',
    attributes: {
      label: '共通チェック事項',
      options: [
        {
          label: 'すべての新規OSSについて、ライセンス種別に誤りがないことを確認した',
          required: true
        },
        {
          label: '意図しないバージョンアップが含まれていないことを確認した',
          required: true
        }
      ]
    }
  });

  // Add guidelines and input fields for each component
  for (const diff of diffs) {
    const licenseId = getLicenseId(diff.component);
    const guidelines = guidelinesMap.get(licenseId) || [];
    
    if (guidelines.length === 0) {
      continue;
    }

    // Add section header
    const componentName = diff.component.group 
      ? `${diff.component.group}:${diff.component.name}`
      : diff.component.name;
    
    issueForm.body.push({
      type: 'markdown',
      attributes: {
        value: `\n### ${escapeMarkdown(componentName)} (${escapeMarkdown(licenseId)})`
      }
    });

    // Add input fields for each guideline
    for (let i = 0; i < guidelines.length; i++) {
      const guideline = guidelines[i];
      const fieldId = `${diff.component.name.replace(/[^a-zA-Z0-9]/g, '-')}-${i}`;
      
      if (guideline.inputType === 'checkbox') {
        issueForm.body.push({
          type: 'checkboxes',
          id: fieldId,
          attributes: {
            label: guideline.label,
            description: guideline.message,
            options: [
              {
                label: '対応済み',
                required: false
              }
            ]
          }
        });
      } else if (guideline.inputType === 'text') {
        issueForm.body.push({
          type: 'input',
          id: fieldId,
          attributes: {
            label: guideline.label,
            description: guideline.message,
            placeholder: '対応内容を記入してください'
          },
          validations: {
            required: true
          }
        });
      } else if (guideline.inputType === 'select' && guideline.options) {
        issueForm.body.push({
          type: 'dropdown',
          id: fieldId,
          attributes: {
            label: guideline.label,
            description: guideline.message,
            options: guideline.options
          },
          validations: {
            required: true
          }
        });
      }
    }
  }

  // Add SBOM artifact link
  issueForm.body.push({
    type: 'markdown',
    attributes: {
      value: `\n---\n\n📦 [SBOM をダウンロード](${sbomArtifactUrl})`
    }
  });

  // Add approval request checkbox
  issueForm.body.push({
    type: 'checkboxes',
    id: 'approval-request',
    attributes: {
      label: '承認依頼',
      options: [
        {
          label: '管理者に承認を依頼する',
          required: false
        }
      ]
    }
  });

  return yaml.dump(issueForm, { lineWidth: -1, noRefs: true });
}

/**
 * Generate Approval Issue (Markdown)
 */
export function generateApprovalIssue(
  version: string,
  reviewResults: ReviewResult[],
  sbomArtifactUrl: string,
  reviewResultsArtifactUrl: string
): string {
  let markdown = `## ✅ OSS利用承認タスク\n\n`;
  markdown += `リリースバージョン: **${version}**\n\n`;
  markdown += `見直し担当者による確認が完了しました。以下の内容を確認し、承認してください。\n\n`;
  
  // Add review results table
  markdown += `### 見直し結果一覧\n\n`;
  markdown += `| OSS名 | バージョン | ライセンス | 対応状況 |\n`;
  markdown += `|-------|-----------|-----------|----------|\n`;
  
  for (const result of reviewResults) {
    const componentName = result.component.group 
      ? `${escapeMarkdown(result.component.group)}:${escapeMarkdown(result.component.name)}`
      : escapeMarkdown(result.component.name);
    const version = escapeMarkdown(result.component.version);
    const license = escapeMarkdown(result.license);
    
    // Summarize actions
    const actionCount = Object.keys(result.actions).length;
    const actionSummary = actionCount > 0 ? `${actionCount}件の対応` : '対応なし';
    
    markdown += `| ${componentName} | ${version} | ${license} | ${actionSummary} |\n`;
  }
  
  // Add detailed review results
  markdown += `\n### 詳細な見直し結果\n\n`;
  
  for (const result of reviewResults) {
    const componentName = result.component.group 
      ? `${result.component.group}:${result.component.name}`
      : result.component.name;
    
    markdown += `#### ${escapeMarkdown(componentName)} (${escapeMarkdown(result.license)})\n\n`;
    
    if (Object.keys(result.actions).length === 0) {
      markdown += `対応事項なし\n\n`;
    } else {
      for (const [label, value] of Object.entries(result.actions)) {
        markdown += `- **${escapeMarkdown(label)}**: ${escapeMarkdown(value)}\n`;
      }
      markdown += `\n`;
    }
  }
  
  // Add artifact links
  markdown += `---\n\n`;
  markdown += `📦 [SBOM をダウンロード](${sbomArtifactUrl})\n\n`;
  markdown += `📄 [見直し結果JSON をダウンロード](${reviewResultsArtifactUrl})\n\n`;
  
  // Add approval checkbox
  markdown += `### 承認\n\n`;
  markdown += `- [ ] 上記の内容を確認し、Dependency-Trackへの登録を承認します\n`;
  
  return markdown;
}

/**
 * Create a GitHub Issue using the GitHub API
 */
export async function createGitHubIssue(
  title: string,
  body: string,
  labels: string[],
  assignees?: string[]
): Promise<number> {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is not set');
    }

    const octokit = github.getOctokit(token);
    const context = github.context;

    const response = await octokit.rest.issues.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title,
      body,
      labels,
      assignees: assignees || []
    });

    console.log(`Issue created successfully: #${response.data.number}`);
    console.log(`URL: ${response.data.html_url}`);

    return response.data.number;
  } catch (error) {
    console.error('Failed to create GitHub Issue:', error);
    throw error;
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage:');
    console.error('  Review Issue: node issue-creator.js review <version> <diff-result.json> <sbom-url> <guidelines-yaml> [assignee]');
    console.error('  Approval Issue: node issue-creator.js approval <version> <review-results.json> <sbom-url> <review-json-url> [assignee]');
    process.exit(1);
  }

  const command = args[0];

  try {
    if (command === 'review') {
      // Create review issue
      if (args.length < 5) {
        console.error('Missing arguments for review issue');
        process.exit(1);
      }

      const version = args[1];
      const diffResultPath = args[2];
      const sbomUrl = args[3];
      const guidelinesYamlPath = args[4];
      const assignee = args[5];

      // Read diff result
      const diffResultContent = fs.readFileSync(diffResultPath, 'utf-8');
      const diffResult = JSON.parse(diffResultContent);
      const diffs: ComponentDiff[] = diffResult.diffs;

      // Build guidelines map from YAML using LicenseGuideProvider
      const { LicenseGuideProvider } = await import('./license-guide-provider');
      const guideProvider = new LicenseGuideProvider(guidelinesYamlPath);
      guideProvider.loadConfig();
      
      const guidelinesMap = new Map<string, Guideline[]>();
      for (const diff of diffs) {
        const licenseId = getLicenseId(diff.component);
        const guidelines = guideProvider.getGuidelines(licenseId);
        guidelinesMap.set(licenseId, guidelines);
      }

      // Generate issue form
      const issueFormYaml = generateReviewIssueForm(version, diffs, guidelinesMap, sbomUrl);
      
      // Output to file for inspection
      fs.writeFileSync('review-issue-form.yml', issueFormYaml, 'utf-8');
      console.log('Review issue form generated: review-issue-form.yml');

      // Create issue if in GitHub Actions environment
      if (process.env.GITHUB_ACTIONS === 'true') {
        const title = `[Review] OSS利用見直し ${version}`;
        const issueNumber = await createGitHubIssue(
          title,
          issueFormYaml,
          ['oss-review'],
          assignee ? [assignee] : undefined
        );
        console.log(`Review issue created: #${issueNumber}`);
      }

    } else if (command === 'approval') {
      // Create approval issue
      if (args.length < 5) {
        console.error('Missing arguments for approval issue');
        process.exit(1);
      }

      const version = args[1];
      const reviewResultsPath = args[2];
      const sbomUrl = args[3];
      const reviewJsonUrl = args[4];
      const assignee = args[5];

      // Read review results
      const reviewResultsContent = fs.readFileSync(reviewResultsPath, 'utf-8');
      const reviewResultsData = JSON.parse(reviewResultsContent);
      const reviewResults: ReviewResult[] = reviewResultsData.results || reviewResultsData;

      // Generate approval issue
      const issueMarkdown = generateApprovalIssue(version, reviewResults, sbomUrl, reviewJsonUrl);
      
      // Output to file for inspection
      fs.writeFileSync('approval-issue.md', issueMarkdown, 'utf-8');
      console.log('Approval issue generated: approval-issue.md');

      // Create issue if in GitHub Actions environment
      if (process.env.GITHUB_ACTIONS === 'true') {
        const title = `[Approval] OSS利用承認 ${version}`;
        const issueNumber = await createGitHubIssue(
          title,
          issueMarkdown,
          ['oss-approval'],
          assignee ? [assignee] : undefined
        );
        console.log(`Approval issue created: #${issueNumber}`);
      }

    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run main if executed directly
if (require.main === module) {
  main();
}
