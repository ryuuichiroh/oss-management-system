/**
 * Core type definitions for OSS Management System
 */
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
    purl?: string;
    hashes?: Hash[];
}
export interface License {
    license?: {
        id?: string;
        name?: string;
        url?: string;
    };
    expression?: string;
}
export interface Hash {
    alg: string;
    content: string;
}
export type ChangeType = 'added' | 'updated' | 'removed';
export interface ComponentDiff {
    changeType: ChangeType;
    component: Component;
    previousVersion?: string;
}
export interface DiffResult {
    comparisonInfo: {
        currentVersion: string;
        previousVersion: string;
        comparedAt: string;
    };
    diffs: ComponentDiff[];
}
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
    options?: string[];
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
export interface ReviewResult {
    component: Component;
    license: string;
    actions: Record<string, string>;
}
export interface ReviewResultsDocument {
    version: string;
    reviewedAt: string;
    reviewer: string;
    results: ComponentReviewResult[];
}
export interface ComponentReviewResult {
    component: {
        group?: string;
        name: string;
        version: string;
    };
    license: string;
    actions: Record<string, string>;
}
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
//# sourceMappingURL=types.d.ts.map