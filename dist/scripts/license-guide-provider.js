"use strict";
/**
 * License Guide Provider
 *
 * Provides license-specific guidelines based on YAML configuration.
 * Supports conditional rules based on component context.
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
exports.LicenseGuideProvider = void 0;
exports.createLicenseGuideProvider = createLicenseGuideProvider;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("js-yaml"));
/**
 * Default guideline returned when no specific guideline is found
 */
const DEFAULT_GUIDELINE = {
    condition: 'always',
    message: 'このライセンスのガイドラインが定義されていません。法務担当に相談してください。',
    inputType: 'text',
    label: '対応内容',
};
/**
 * License Guide Provider class
 */
class LicenseGuideProvider {
    constructor(configPath) {
        this.config = null;
        this.configPath = configPath;
    }
    /**
     * Load YAML configuration file
     */
    loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.warn(`License guideline configuration file not found: ${this.configPath}`);
                console.warn('Using default guidelines for all licenses.');
                this.config = null;
                return;
            }
            const fileContent = fs.readFileSync(this.configPath, 'utf8');
            const parsed = yaml.load(fileContent);
            // Validate basic structure
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid YAML structure');
            }
            if (!parsed.version || !Array.isArray(parsed.guidelines)) {
                throw new Error('Missing required fields: version or guidelines');
            }
            this.config = parsed;
            console.log(`Loaded license guidelines configuration (version: ${parsed.version})`);
        }
        catch (error) {
            console.warn(`Failed to load license guideline configuration: ${error}`);
            console.warn('Using default guidelines for all licenses.');
            this.config = null;
        }
    }
    /**
     * Get guidelines for a specific license ID and context
     */
    getGuidelines(licenseId, context = {}) {
        // If config is not loaded, try to load it
        if (this.config === null) {
            this.loadConfig();
        }
        // If still no config, return default guideline
        if (this.config === null) {
            return [DEFAULT_GUIDELINE];
        }
        // Find license guideline
        const licenseGuideline = this.config.guidelines.find((g) => g.license_id === licenseId);
        // If license not found, return default guideline
        if (!licenseGuideline) {
            return [DEFAULT_GUIDELINE];
        }
        // Filter rules based on context
        const applicableRules = licenseGuideline.rules.filter((rule) => this.evaluateCondition(rule.condition, context));
        // Convert rules to guidelines
        return applicableRules.map((rule) => this.ruleToGuideline(rule));
    }
    /**
     * Evaluate a condition against the component context
     */
    evaluateCondition(condition, context) {
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
        if (trimmedCondition === 'link_type == "static"' ||
            trimmedCondition === "link_type == 'static'") {
            return context.linkType === 'static';
        }
        if (trimmedCondition === 'link_type == "dynamic"' ||
            trimmedCondition === "link_type == 'dynamic'") {
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
            const parts = trimmedCondition.split('&&').map((p) => p.trim());
            return parts.every((part) => this.evaluateCondition(part, context));
        }
        // Handle compound conditions with OR (||)
        if (trimmedCondition.includes('||')) {
            const parts = trimmedCondition.split('||').map((p) => p.trim());
            return parts.some((part) => this.evaluateCondition(part, context));
        }
        // Unknown condition - log warning and return false
        console.warn(`Unknown condition: ${condition}`);
        return false;
    }
    /**
     * Convert a guideline rule to a Guideline object
     */
    ruleToGuideline(rule) {
        return {
            condition: rule.condition,
            message: rule.message,
            inputType: rule.input_type,
            label: rule.label,
            options: rule.options,
        };
    }
    /**
     * Get all license IDs defined in the configuration
     */
    getLicenseIds() {
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
    getCommonInstructions(licenseId) {
        if (this.config === null) {
            this.loadConfig();
        }
        if (this.config === null) {
            return null;
        }
        const licenseGuideline = this.config.guidelines.find((g) => g.license_id === licenseId);
        return licenseGuideline?.common_instructions || null;
    }
}
exports.LicenseGuideProvider = LicenseGuideProvider;
/**
 * Create a License Guide Provider instance
 */
function createLicenseGuideProvider(configPath) {
    return new LicenseGuideProvider(configPath);
}
//# sourceMappingURL=license-guide-provider.js.map