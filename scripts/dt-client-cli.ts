#!/usr/bin/env node
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

import * as fs from 'fs';
import {
  getSBOM,
  uploadSBOM,
  setComponentPropertyByComponent,
  DTClientError
} from './dt-client';
import { SBOM, Component } from './types';

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
  } catch (error) {
    if (error instanceof DTClientError) {
      console.error(`DT Client Error: ${error.message}`);
      if (error.statusCode) {
        console.error(`Status Code: ${error.statusCode}`);
      }
      if (error.responseBody) {
        console.error(`Response: ${error.responseBody}`);
      }
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

/**
 * Handle get-sbom command
 */
async function handleGetSBOM(args: string[]) {
  if (args.length < 2) {
    console.error('Usage: node dt-client-cli.js get-sbom <project-name> <version> [output.json]');
    process.exit(1);
  }
  
  const projectName = args[0];
  const version = args[1];
  const outputPath = args[2] || 'sbom.json';
  
  console.log(`Fetching SBOM for project: ${projectName} version: ${version}`);
  
  const sbom = await getSBOM(projectName, version);
  
  if (!sbom) {
    console.log('Project not found in Dependency-Track');
    process.exit(1);
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2), 'utf-8');
  console.log(`SBOM saved to: ${outputPath}`);
  console.log(`Components: ${sbom.components.length}`);
}

/**
 * Handle upload-sbom command
 */
async function handleUploadSBOM(args: string[]) {
  if (args.length < 3) {
    console.error('Usage: node dt-client-cli.js upload-sbom <project-name> <version> <sbom.json>');
    process.exit(1);
  }
  
  const projectName = args[0];
  const version = args[1];
  const sbomPath = args[2];
  
  console.log(`Uploading SBOM for project: ${projectName} version: ${version}`);
  
  const sbomContent = fs.readFileSync(sbomPath, 'utf-8');
  const sbom: SBOM = JSON.parse(sbomContent);
  
  const projectUuid = await uploadSBOM(projectName, version, sbom);
  
  console.log(`SBOM uploaded successfully`);
  console.log(`Project UUID: ${projectUuid}`);
}

/**
 * Handle set-property command
 */
async function handleSetProperty(args: string[]) {
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
  
  const component: Component = JSON.parse(componentJson);
  
  // First get the project UUID
  const { getProject } = await import('./dt-client');
  const project = await getProject(projectName, version);
  
  if (!project) {
    console.error('Project not found in Dependency-Track');
    process.exit(1);
  }
  
  await setComponentPropertyByComponent(
    project.uuid,
    component,
    propertyName,
    propertyValue
  );
  
  console.log(`Property set successfully`);
}

// Run main if executed directly
if (require.main === module) {
  main();
}
