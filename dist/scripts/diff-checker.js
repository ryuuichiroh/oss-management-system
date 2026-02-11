#!/usr/bin/env node
"use strict";
/**
 * SBOM Diff Checker
 *
 * Compares two SBOMs and identifies component differences (added, updated, removed).
 *
 * Usage:
 *   node diff-checker.js <current-sbom.json> <previous-sbom.json> [output.json]
 *
 * Requirements: 2.2, 2.3, 2.4
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
exports.compareSBOMs = compareSBOMs;
const fs = __importStar(require("fs"));
/**
 * Creates a unique key for a component based on group and name
 */
function getComponentKey(component) {
    const group = component.group || '';
    return `${group}:${component.name}`;
}
/**
 * Compares two SBOMs and returns the list of component differences
 */
function compareSBOMs(currentSbom, previousSbom) {
    const diffs = [];
    // Build a map of previous components: key -> component
    const previousMap = new Map();
    for (const component of previousSbom.components) {
        const key = getComponentKey(component);
        previousMap.set(key, component);
    }
    // Check current components for added or updated
    const processedKeys = new Set();
    for (const currentComponent of currentSbom.components) {
        const key = getComponentKey(currentComponent);
        processedKeys.add(key);
        const previousComponent = previousMap.get(key);
        if (!previousComponent) {
            // Component exists in current but not in previous -> added
            diffs.push({
                changeType: 'added',
                component: currentComponent
            });
        }
        else if (previousComponent.version !== currentComponent.version) {
            // Component exists in both but version differs -> updated
            diffs.push({
                changeType: 'updated',
                component: currentComponent,
                previousVersion: previousComponent.version
            });
        }
        // If versions match, no diff
    }
    // Check for removed components (in previous but not in current)
    for (const [key, previousComponent] of previousMap.entries()) {
        if (!processedKeys.has(key)) {
            diffs.push({
                changeType: 'removed',
                component: previousComponent
            });
        }
    }
    return diffs;
}
/**
 * Main function to read SBOMs, compare them, and output the result
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node diff-checker.js <current-sbom.json> <previous-sbom.json> [output.json]');
        process.exit(1);
    }
    const currentSbomPath = args[0];
    const previousSbomPath = args[1];
    const outputPath = args[2] || 'diff-result.json';
    try {
        // Read SBOMs
        const currentSbomContent = fs.readFileSync(currentSbomPath, 'utf-8');
        const currentSbom = JSON.parse(currentSbomContent);
        const previousSbomContent = fs.readFileSync(previousSbomPath, 'utf-8');
        const previousSbom = JSON.parse(previousSbomContent);
        // Validate SBOM format
        if (!currentSbom.bomFormat || currentSbom.bomFormat !== 'CycloneDX') {
            throw new Error(`Invalid current SBOM format. Expected 'CycloneDX', got: '${currentSbom.bomFormat}'`);
        }
        if (!previousSbom.bomFormat || previousSbom.bomFormat !== 'CycloneDX') {
            throw new Error(`Invalid previous SBOM format. Expected 'CycloneDX', got: '${previousSbom.bomFormat}'`);
        }
        // Validate components array
        if (!Array.isArray(currentSbom.components)) {
            throw new Error(`Invalid current SBOM: 'components' must be an array. Got: ${typeof currentSbom.components}`);
        }
        if (!Array.isArray(previousSbom.components)) {
            throw new Error(`Invalid previous SBOM: 'components' must be an array. Got: ${typeof previousSbom.components}`);
        }
        // Compare SBOMs
        const diffs = compareSBOMs(currentSbom, previousSbom);
        // Build result
        const result = {
            comparisonInfo: {
                currentVersion: currentSbom.version?.toString() || 'unknown',
                previousVersion: previousSbom.version?.toString() || 'unknown',
                comparedAt: new Date().toISOString()
            },
            diffs
        };
        // Output result
        const resultJson = JSON.stringify(result, null, 2);
        fs.writeFileSync(outputPath, resultJson, 'utf-8');
        console.log(`Diff check complete. Found ${diffs.length} differences.`);
        console.log(`- Added: ${diffs.filter(d => d.changeType === 'added').length}`);
        console.log(`- Updated: ${diffs.filter(d => d.changeType === 'updated').length}`);
        console.log(`- Removed: ${diffs.filter(d => d.changeType === 'removed').length}`);
        console.log(`Result written to: ${outputPath}`);
    }
    catch (error) {
        console.error('Error during diff check:', error);
        process.exit(1);
    }
}
// Run main if executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=diff-checker.js.map