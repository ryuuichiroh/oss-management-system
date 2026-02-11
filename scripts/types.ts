/**
 * Core type definitions for OSS Management System
 */

// ============================================================================
// SBOM Types (CycloneDX)
// ============================================================================

export interface SBOM {
  bomFormat: 'CycloneDX';
  specVersion: string;
  serialNumber?: string;
  version?: number;
  metadata?: Metadata;
  components: Component[];
}

export interface Metadata {
  timestamp?: string;
  tools?: Tool[];
  component?: Component;
}

export interface Tool {
  vendor?: string;
  name?: string;
  version?: string;
}

export interface Component {
  type: 'library' | 'application' | 'framework' | 'container' | 'file';
  group?: string;
  name: string;
  version: string;
  licenses?: License[];
  purl?: string; // Package URL
  hashes?: Hash[];
}

export interface License {
  license?: {
    id?: string; // SPDX ID
    name?: string;
    url?: string;
  };
  expression?: string; // SPDX expression
}

export interface Hash {
  alg: string;
  content: string;
}

// ============================================================================
// Diff Types
// ============================================================================

export type ChangeType = 'added' | 'updated' | 'removed';

export interface ComponentDiff {
  changeType: ChangeType;
  component: Component;
  previousVersion?: string; // Only for 'updated' type
}

export interface DiffResult {
  comparisonInfo: {
    currentVersion: string;
    previousVersion: string;
    comparedAt: string; // ISO 8601
  };
  diffs: ComponentDiff[];
}

// ============================================================================
// License Guideline Types
// ============================================================================

export interface ComponentContext {
  isModified?: boolean;
  linkType?: 'static' | 'dynamic';
  isDistributed?: boolean;
}

export type InputType = 'checkbox' | 'text' | 'select';

export interface Guideline {
  condition: string;
  message: string;
  inputType: InputType;
  label: string;
  options?: string[]; // Only for 'select' type
}

export interface LicenseGuidelineConfig {
  version: string;
  guidelines: LicenseGuideline[];
}

export interface LicenseGuideline {
  license_id: string;
  common_instructions?: string;
  rules: GuidelineRule[];
}

export interface GuidelineRule {
  condition: string;
  message: string;
  input_type: string;
  label: string;
  options?: string[];
}

// ============================================================================
// Review and Approval Types
// ============================================================================

export interface ReviewResult {
  component: Component;
  license: string;
  actions: Record<string, string>; // label -> value
}

export interface ReviewResultsDocument {
  version: string; // Release version
  reviewedAt: string; // ISO 8601
  reviewer: string; // GitHub username
  results: ComponentReviewResult[];
}

export interface ComponentReviewResult {
  component: {
    group?: string;
    name: string;
    version: string;
  };
  license: string;
  actions: Record<string, string>; // label -> value
}

// ============================================================================
// Dependency-Track Types
// ============================================================================

export interface DTProject {
  uuid: string;
  name: string;
  version: string;
}

export interface DTComponent {
  uuid: string;
  group?: string;
  name: string;
  version: string;
}

export interface DTComponentProperty {
  groupName?: string;
  propertyName: string;
  propertyValue: string;
  propertyType?: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'NUMBER';
}

// ============================================================================
// Config-Based Version Management Types
// ============================================================================

/**
 * Configuration file structure for oss-management-system.yml
 */
export interface OSSManagementConfig {
  preProjectVersion?: string | null;
}

/**
 * Result of config file reading operation
 */
export interface ConfigReadResult {
  success: boolean;
  config?: OSSManagementConfig;
  error?: string;
  filePath: string;
}

/**
 * Version resolution result
 */
export interface VersionResolution {
  previousVersion: string | null;
  isFirstVersion: boolean;
  source: 'config-file' | 'first-version' | 'dt-not-found';
  reason?: string;
}
