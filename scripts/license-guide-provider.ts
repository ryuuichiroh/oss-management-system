/**
 * License Guide Provider
 * 
 * Provides license-specific guidelines based on YAML configuration.
 * Supports conditional rules based on component context.
 */

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {
  ComponentContext,
  Guideline,
  LicenseGuidelineConfig,
  GuidelineRule,
  InputType
} from './types';

/**
 * Default guideline returned when no specific guideline is found
 */
const DEFAULT_GUIDELINE: Guideline = {
  condition: 'always',
  message: 'このライセンスのガイドラインが定義されていません。法務担当に相談してください。',
  inputType: 'text',
  label: '対応内容'
};

/**
 * License Guide Provider class
 */
export class LicenseGuideProvider {
  private config: LicenseGuidelineConfig | null = null;
  private configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Load YAML configuration file
   */
  loadConfig(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        console.warn(`License guideline configuration file not found: ${this.configPath}`);
        console.warn('Using default guidelines for all licenses.');
        this.config = null;
        return;
      }

      const fileContent = fs.readFileSync(this.configPath, 'utf8');
      const parsed = yaml.load(fileContent) as LicenseGuidelineConfig;

      // Validate basic structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML structure');
      }

      if (!parsed.version || !Array.isArray(parsed.guidelines)) {
        throw new Error('Missing required fields: version or guidelines');
      }

      this.config = parsed;
      console.log(`Loaded license guidelines configuration (version: ${parsed.version})`);
    } catch (error) {
      console.warn(`Failed to load license guideline configuration: ${error}`);
      console.warn('Using default guidelines for all licenses.');
      this.config = null;
    }
  }

  /**
   * Get guidelines for a specific license ID and context
   */
  getGuidelines(licenseId: string, context: ComponentContext = {}): Guideline[] {
    // If config is not loaded, try to load it
    if (this.config === null) {
      this.loadConfig();
    }

    // If still no config, return default guideline
    if (this.config === null) {
      return [DEFAULT_GUIDELINE];
    }

    // Find license guideline
    const licenseGuideline = this.config.guidelines.find(
      (g) => g.license_id === licenseId
    );

    // If license not found, return default guideline
    if (!licenseGuideline) {
      return [DEFAULT_GUIDELINE];
    }

    // Filter rules based on context
    const applicableRules = licenseGuideline.rules.filter((rule) =>
      this.evaluateCondition(rule.condition, context)
    );

    // Convert rules to guidelines
    return applicableRules.map((rule) => this.ruleToGuideline(rule));
  }

  /**
   * Evaluate a condition against the component context
   */
  private evaluateCondition(condition: string, context: ComponentContext): boolean {
    // Trim whitespace
    const trimmedCondition = condition.trim();

    // Handle 'always' condition
    if (trimmedCondition === 'always') {
      return true;
    }

    // Handle 'is_modified' condition
    if (trimmedCondition === 'is_modified == true' || trimmedCondition === 'is_modified') {
      return context.isModified === true;
    }

    if (trimmedCondition === 'is_modified == false' || trimmedCondition === '!is_modified') {
      return context.isModified === false;
    }

    // Handle 'link_type' condition
    if (trimmedCondition === 'link_type == "static"' || trimmedCondition === "link_type == 'static'") {
      return context.linkType === 'static';
    }

    if (trimmedCondition === 'link_type == "dynamic"' || trimmedCondition === "link_type == 'dynamic'") {
      return context.linkType === 'dynamic';
    }

    // Handle 'is_distributed' condition
    if (trimmedCondition === 'is_distributed == true' || trimmedCondition === 'is_distributed') {
      return context.isDistributed === true;
    }

    if (trimmedCondition === 'is_distributed == false' || trimmedCondition === '!is_distributed') {
      return context.isDistributed === false;
    }

    // Handle compound conditions with AND (&&)
    if (trimmedCondition.includes('&&')) {
      const parts = trimmedCondition.split('&&').map(p => p.trim());
      return parts.every(part => this.evaluateCondition(part, context));
    }

    // Handle compound conditions with OR (||)
    if (trimmedCondition.includes('||')) {
      const parts = trimmedCondition.split('||').map(p => p.trim());
      return parts.some(part => this.evaluateCondition(part, context));
    }

    // Unknown condition - log warning and return false
    console.warn(`Unknown condition: ${condition}`);
    return false;
  }

  /**
   * Convert a guideline rule to a Guideline object
   */
  private ruleToGuideline(rule: GuidelineRule): Guideline {
    return {
      condition: rule.condition,
      message: rule.message,
      inputType: rule.input_type as InputType,
      label: rule.label,
      options: rule.options
    };
  }

  /**
   * Get all license IDs defined in the configuration
   */
  getLicenseIds(): string[] {
    if (this.config === null) {
      this.loadConfig();
    }

    if (this.config === null) {
      return [];
    }

    return this.config.guidelines.map((g) => g.license_id);
  }

  /**
   * Get common instructions for a license (if defined)
   */
  getCommonInstructions(licenseId: string): string | null {
    if (this.config === null) {
      this.loadConfig();
    }

    if (this.config === null) {
      return null;
    }

    const licenseGuideline = this.config.guidelines.find(
      (g) => g.license_id === licenseId
    );

    return licenseGuideline?.common_instructions || null;
  }
}

/**
 * Create a License Guide Provider instance
 */
export function createLicenseGuideProvider(configPath: string): LicenseGuideProvider {
  return new LicenseGuideProvider(configPath);
}
