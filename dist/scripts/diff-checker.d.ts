#!/usr/bin/env node
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
import { SBOM, ComponentDiff } from './types';
/**
 * Compares two SBOMs and returns the list of component differences
 */
export declare function compareSBOMs(currentSbom: SBOM, previousSbom: SBOM): ComponentDiff[];
//# sourceMappingURL=diff-checker.d.ts.map