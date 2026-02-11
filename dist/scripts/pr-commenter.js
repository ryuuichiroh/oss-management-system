#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateComment = generateComment;
exports.postComment = postComment;
const fs = __importStar(require("fs"));
const github = __importStar(require("@actions/github"));
const license_guide_provider_1 = require("./license-guide-provider");
/**
 * Get the change type emoji
 */
function getChangeEmoji(changeType) {
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
function getLicenseId(diff) {
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
function formatVersion(diff) {
    if (diff.changeType === 'updated' && diff.previousVersion) {
        return `${diff.previousVersion} → ${diff.component.version || 'unknown'}`;
    }
    return diff.component.version || 'unknown';
}
/**
 * Escape Markdown special characters
 */
function escapeMarkdown(text) {
    if (!text) {
        return '';
    }
    return text.replace(/\|/g, '\\|').replace(/\n/g, ' ').replace(/\r/g, '');
}
/**
 * Generate Markdown comment from diff list and guidelines
 */
function generateComment(diffs, guidelinesMap, sbomArtifactUrl) {
    const lines = [];
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
async function postComment(prNumber, comment, token, repository) {
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
            body: comment,
        });
        console.log(`Comment posted successfully to PR #${prNumber}`);
    }
    catch (error) {
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
        const diffResult = JSON.parse(diffResultContent);
        console.log(`Loaded ${diffResult.diffs.length} component differences`);
        // If no diffs, post a simple message
        if (diffResult.diffs.length === 0) {
            const comment = '## 🔍 OSS差分検出\n\n前回リリースとの差分はありませんでした。';
            await postComment(prNumber, comment, token, repository);
            console.log('No differences found. Posted simple message.');
            return;
        }
        // Load license guidelines
        const guideProvider = new license_guide_provider_1.LicenseGuideProvider(licenseGuidelinePath);
        guideProvider.loadConfig();
        // Build guidelines map
        const guidelinesMap = new Map();
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
    }
    catch (error) {
        console.error('Error during PR comment posting:', error);
        process.exit(1);
    }
}
// Run main if executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=pr-commenter.js.map