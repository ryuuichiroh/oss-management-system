/**
 * License Guide Provider
 *
 * Provides license-specific guidelines based on YAML configuration.
 * Supports conditional rules based on component context.
 */
import { ComponentContext, Guideline } from './types';
/**
 * License Guide Provider class
 */
export declare class LicenseGuideProvider {
    private config;
    private configPath;
    constructor(configPath: string);
    /**
     * Load YAML configuration file
     */
    loadConfig(): void;
    /**
     * Get guidelines for a specific license ID and context
     */
    getGuidelines(licenseId: string, context?: ComponentContext): Guideline[];
    /**
     * Evaluate a condition against the component context
     */
    private evaluateCondition;
    /**
     * Convert a guideline rule to a Guideline object
     */
    private ruleToGuideline;
    /**
     * Get all license IDs defined in the configuration
     */
    getLicenseIds(): string[];
    /**
     * Get common instructions for a license (if defined)
     */
    getCommonInstructions(licenseId: string): string | null;
}
/**
 * Create a License Guide Provider instance
 */
export declare function createLicenseGuideProvider(configPath: string): LicenseGuideProvider;
//# sourceMappingURL=license-guide-provider.d.ts.map