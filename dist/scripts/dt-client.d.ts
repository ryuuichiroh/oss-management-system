/**
 * Dependency-Track API Client
 *
 * Provides functions to interact with Dependency-Track API:
 * - Get SBOM from a project
 * - Upload SBOM to create/update a project
 * - Get components list from a project
 * - Set component properties
 */
import { SBOM, DTProject, DTComponent, DTComponentProperty, Component } from './types';
export declare class DTClientError extends Error {
    statusCode?: number | undefined;
    responseBody?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, responseBody?: string | undefined);
}
/**
 * Get project by name and version
 */
export declare function getProject(projectName: string, version: string): Promise<DTProject | null>;
/**
 * Get SBOM from a project
 *
 * @param projectName - Project name
 * @param version - Project version
 * @returns SBOM in CycloneDX format, or null if project not found
 */
export declare function getSBOM(projectName: string, version: string): Promise<SBOM | null>;
/**
 * Upload SBOM to Dependency-Track
 *
 * @param projectName - Project name
 * @param version - Project version
 * @param sbom - SBOM in CycloneDX format
 * @returns Project UUID
 */
export declare function uploadSBOM(projectName: string, version: string, sbom: SBOM): Promise<string>;
/**
 * Get components list from a project
 *
 * @param projectUuid - Project UUID
 * @returns List of components
 */
export declare function getComponents(projectUuid: string): Promise<DTComponent[]>;
/**
 * Find component UUID by matching group, name, and version
 *
 * @param projectUuid - Project UUID
 * @param component - Component to find
 * @returns Component UUID, or null if not found
 */
export declare function findComponentUuid(projectUuid: string, component: Component): Promise<string | null>;
/**
 * Set component property
 *
 * @param componentUuid - Component UUID
 * @param property - Property to set
 */
export declare function setComponentProperty(componentUuid: string, property: DTComponentProperty): Promise<void>;
/**
 * Set component property by finding component first
 *
 * @param projectUuid - Project UUID
 * @param component - Component to set property for
 * @param propertyName - Property name
 * @param propertyValue - Property value
 */
export declare function setComponentPropertyByComponent(projectUuid: string, component: Component, propertyName: string, propertyValue: string): Promise<void>;
//# sourceMappingURL=dt-client.d.ts.map