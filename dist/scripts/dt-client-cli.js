#!/usr/bin/env node
"use strict";
/**
 * Dependency-Track Client CLI
 *
 * Command-line interface for DT Client operations.
 *
 * Usage:
 *   node dt-client-cli.js get-sbom <project-name> <version> [output.json]
 *   node dt-client-cli.js upload-sbom <project-name> <version> <sbom.json>
 *   node dt-client-cli.js set-property <project-name> <version> <component-json> <property-name> <property-value>
 *
 * Environment Variables:
 *   DT_BASE_URL: Dependency-Track base URL (default: http://localhost:8081)
 *   DT_API_KEY: Dependency-Track API key (required)
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
const fs = __importStar(require("fs"));
const dt_client_1 = require("./dt-client");
/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage:');
        console.error('  node dt-client-cli.js get-sbom <project-name> <version> [output.json]');
        console.error('  node dt-client-cli.js upload-sbom <project-name> <version> <sbom.json>');
        console.error('  node dt-client-cli.js set-property <project-name> <version> <component-json> <property-name> <property-value>');
        process.exit(1);
    }
    const command = args[0];
    try {
        switch (command) {
            case 'get-sbom':
                await handleGetSBOM(args.slice(1));
                break;
            case 'upload-sbom':
                await handleUploadSBOM(args.slice(1));
                break;
            case 'set-property':
                await handleSetProperty(args.slice(1));
                break;
            default:
                console.error(`Unknown command: ${command}`);
                process.exit(1);
        }
    }
    catch (error) {
        if (error instanceof dt_client_1.DTClientError) {
            console.error(`DT Client Error: ${error.message}`);
            if (error.statusCode) {
                console.error(`Status Code: ${error.statusCode}`);
            }
            if (error.responseBody) {
                console.error(`Response: ${error.responseBody}`);
            }
        }
        else {
            console.error('Error:', error);
        }
        process.exit(1);
    }
}
/**
 * Handle get-sbom command
 */
async function handleGetSBOM(args) {
    if (args.length < 2) {
        console.error('Usage: node dt-client-cli.js get-sbom <project-name> <version> [output.json]');
        process.exit(1);
    }
    const projectName = args[0];
    const version = args[1];
    const outputPath = args[2] || 'sbom.json';
    console.log(`Fetching SBOM for project: ${projectName} version: ${version}`);
    const sbom = await (0, dt_client_1.getSBOM)(projectName, version);
    if (!sbom) {
        console.log('Project not found in Dependency-Track');
        process.exit(1);
    }
    // Ensure components is an array
    if (!sbom.components) {
        sbom.components = [];
    }
    fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2), 'utf-8');
    console.log(`SBOM saved to: ${outputPath}`);
    console.log(`Components: ${sbom.components.length}`);
}
/**
 * Handle upload-sbom command
 */
async function handleUploadSBOM(args) {
    if (args.length < 3) {
        console.error('Usage: node dt-client-cli.js upload-sbom <project-name> <version> <sbom.json>');
        process.exit(1);
    }
    const projectName = args[0];
    const version = args[1];
    const sbomPath = args[2];
    console.log(`Uploading SBOM for project: ${projectName} version: ${version}`);
    const sbomContent = fs.readFileSync(sbomPath, 'utf-8');
    const sbom = JSON.parse(sbomContent);
    const projectUuid = await (0, dt_client_1.uploadSBOM)(projectName, version, sbom);
    console.log(`SBOM uploaded successfully`);
    console.log(`Project UUID: ${projectUuid}`);
}
/**
 * Handle set-property command
 */
async function handleSetProperty(args) {
    if (args.length < 5) {
        console.error('Usage: node dt-client-cli.js set-property <project-name> <version> <component-json> <property-name> <property-value>');
        process.exit(1);
    }
    const projectName = args[0];
    const version = args[1];
    const componentJson = args[2];
    const propertyName = args[3];
    const propertyValue = args[4];
    console.log(`Setting property for component in project: ${projectName} version: ${version}`);
    const component = JSON.parse(componentJson);
    // First get the project UUID
    const { getProject } = await Promise.resolve().then(() => __importStar(require('./dt-client')));
    const project = await getProject(projectName, version);
    if (!project) {
        console.error('Project not found in Dependency-Track');
        process.exit(1);
    }
    await (0, dt_client_1.setComponentPropertyByComponent)(project.uuid, component, propertyName, propertyValue);
    console.log(`Property set successfully`);
}
// Run main if executed directly
if (require.main === module) {
    main();
}
//# sourceMappingURL=dt-client-cli.js.map