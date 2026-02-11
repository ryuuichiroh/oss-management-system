#!/usr/bin/env node
"use strict";
/**
 * Issue Parser
 *
 * Parses GitHub Issue bodies to extract review results.
 * Supports both Review Issues (YAML form output) and Approval Issues (Markdown).
 *
 * Requirements: 8.1, 8.2, 8.4
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
exports.parseReviewIssue = parseReviewIssue;
exports.parseApprovalIssue = parseApprovalIssue;
exports.parseApprovalRequest = parseApprovalRequest;
const fs = __importStar(require("fs"));
/**
 * Parse checkbox state from GitHub Issue Form output
 * Format: "- [x] Label" or "- [ ] Label"
 */
function parseCheckboxState(text, label) {
    // Match checkbox with the specific label
    const regex = new RegExp(`^\\s*-\\s*\\[([ xX])\\]\\s*${escapeRegex(label)}\\s*$`, 'm');
    const match = text.match(regex);
    if (!match) {
        return false;
    }
    return match[1].toLowerCase() === 'x';
}
/**
 * Escape special regex characters
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function parseComponentFromTable(tableRow) {
    // Split by pipe and extract fields
    const parts = tableRow
        .split('|')
        .map((p) => p.trim())
        .filter((p) => p);
    if (parts.length < 4) {
        return null;
    }
    const emoji = parts[0];
    const fullName = parts[1];
    const versionStr = parts[2];
    const license = parts[3];
    // Parse group:name or just name
    let group;
    let name;
    if (fullName.includes(':')) {
        const colonIndex = fullName.indexOf(':');
        group = fullName.substring(0, colonIndex);
        name = fullName.substring(colonIndex + 1);
    }
    else {
        name = fullName;
    }
    // Parse version (handle "1.0.0 → 2.0.0" format)
    let version;
    if (versionStr.includes('→')) {
        const arrowIndex = versionStr.indexOf('→');
        version = versionStr.substring(arrowIndex + 1).trim();
    }
    else {
        version = versionStr;
    }
    // Determine change type from emoji
    let changeType;
    if (emoji.includes('🆕')) {
        changeType = 'added';
    }
    else if (emoji.includes('🔄')) {
        changeType = 'updated';
    }
    else if (emoji.includes('🗑️')) {
        changeType = 'removed';
    }
    else {
        changeType = 'unknown';
    }
    return {
        group: group || undefined,
        name,
        version,
        license,
        changeType,
    };
}
/**
 * Parse all components from the diff table
 */
function parseComponentsFromTable(issueBody) {
    const components = [];
    // Find the table section - look for the header row and capture everything after it
    const lines = issueBody.split('\n');
    let inTable = false;
    for (const line of lines) {
        // Check if this is the table header
        if (line.includes('変更') &&
            line.includes('OSS名') &&
            line.includes('バージョン') &&
            line.includes('ライセンス')) {
            inTable = true;
            continue;
        }
        // Skip separator row
        if (inTable && line.includes('---')) {
            continue;
        }
        // Stop at empty line or new section
        if (inTable && (!line.trim() || line.startsWith('#'))) {
            break;
        }
        // Parse table row
        if (inTable && line.includes('|')) {
            const component = parseComponentFromTable(line);
            if (component) {
                components.push(component);
            }
        }
    }
    return components;
}
/**
 * Parse review results from a Review Issue body
 */
function parseReviewIssue(issueBody, reviewer, version) {
    const components = parseComponentsFromTable(issueBody);
    const results = [];
    for (const comp of components) {
        const actions = {};
        // Find the component section in the issue body
        const componentName = comp.group ? `${comp.group}:${comp.name}` : comp.name;
        const sectionRegex = new RegExp(`###\\s*${escapeRegex(componentName)}\\s*\\(${escapeRegex(comp.license)}\\)([\\s\\S]*?)(?=\\n###|\\n##|---)`);
        const sectionMatch = issueBody.match(sectionRegex);
        if (sectionMatch) {
            const sectionContent = sectionMatch[1];
            // Parse all input fields in this section
            // Look for headings followed by content
            const fieldMatches = sectionContent.matchAll(/####\s*([^\n]+)\n+([\s\S]*?)(?=\n####|$)/g);
            for (const fieldMatch of fieldMatches) {
                const fieldLabel = fieldMatch[1].trim();
                const fieldContent = fieldMatch[2].trim();
                // Check if it's a checkbox
                if (fieldContent.includes('- [')) {
                    const isChecked = parseCheckboxState(fieldContent, '対応済み');
                    actions[fieldLabel] = isChecked ? '対応済み' : '未対応';
                }
                else if (fieldContent &&
                    fieldContent !== 'No response' &&
                    fieldContent !== '_No response_') {
                    // It's a text or select field
                    actions[fieldLabel] = fieldContent;
                }
            }
        }
        results.push({
            component: {
                group: comp.group,
                name: comp.name,
                version: comp.version,
            },
            license: comp.license,
            actions,
        });
    }
    return {
        version,
        reviewedAt: new Date().toISOString(),
        reviewer,
        results,
    };
}
/**
 * Parse approval checkbox state from Approval Issue body
 */
function parseApprovalIssue(issueBody) {
    return parseCheckboxState(issueBody, '上記の内容を確認し、Dependency-Trackへの登録を承認します');
}
/**
 * Parse approval request checkbox from Review Issue body
 */
function parseApprovalRequest(issueBody) {
    return parseCheckboxState(issueBody, '管理者に承認を依頼する');
}
/**
 * Main function for CLI usage
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage:');
        console.error('  Parse Review Issue: node issue-parser.js review <issue-body.txt> <reviewer> <version> [output.json]');
        console.error('  Parse Approval Issue: node issue-parser.js approval <issue-body.txt>');
        console.error('  Parse Approval Request: node issue-parser.js approval-request <issue-body.txt>');
        process.exit(1);
    }
    const command = args[0];
    try {
        if (command === 'review') {
            // Parse review issue
            if (args.length < 4) {
                console.error('Missing arguments for review issue parsing');
                process.exit(1);
            }
            const issueBodyPath = args[1];
            const reviewer = args[2];
            const version = args[3];
            const outputPath = args[4] || 'review-results.json';
            const issueBody = fs.readFileSync(issueBodyPath, 'utf-8');
            const reviewResults = parseReviewIssue(issueBody, reviewer, version);
            fs.writeFileSync(outputPath, JSON.stringify(reviewResults, null, 2), 'utf-8');
            console.log(`Review results parsed and saved to: ${outputPath}`);
            console.log(`Found ${reviewResults.results.length} components`);
        }
        else if (command === 'approval') {
            // Parse approval checkbox
            if (args.length < 2) {
                console.error('Missing arguments for approval issue parsing');
                process.exit(1);
            }
            const issueBodyPath = args[1];
            const issueBody = fs.readFileSync(issueBodyPath, 'utf-8');
            const isApproved = parseApprovalIssue(issueBody);
            console.log(`Approval status: ${isApproved ? 'APPROVED' : 'NOT APPROVED'}`);
            process.exit(isApproved ? 0 : 1);
        }
        else if (command === 'approval-request') {
            // Parse approval request checkbox
            if (args.length < 2) {
                console.error('Missing arguments for approval request parsing');
                process.exit(1);
            }
            const issueBodyPath = args[1];
            const issueBody = fs.readFileSync(issueBodyPath, 'utf-8');
            const isRequested = parseApprovalRequest(issueBody);
            console.log(`Approval request: ${isRequested ? 'REQUESTED' : 'NOT REQUESTED'}`);
            process.exit(isRequested ? 0 : 1);
        }
        else {
            console.error(`Unknown command: ${command}`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}
// Run main if executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=issue-parser.js.map