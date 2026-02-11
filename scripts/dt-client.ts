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

// ============================================================================
// Configuration
// ============================================================================

const DT_BASE_URL = process.env.DT_BASE_URL || 'http://localhost:8081';
const DT_API_KEY = process.env.DT_API_KEY || '';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Error Classes
// ============================================================================

export class DTClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'DTClientError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make HTTP request with retry logic for 5xx errors
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If successful or client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error (5xx) - retry
      if (response.status >= 500 && attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.warn(
          `DT API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `DT API request failed: ${lastError.message}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw new DTClientError(
    `Failed after ${retries} retries: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Get common headers for DT API requests
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': DT_API_KEY,
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get project by name and version
 */
export async function getProject(projectName: string, version: string): Promise<DTProject | null> {
  const url = `${DT_BASE_URL}/api/v1/project/lookup?name=${encodeURIComponent(projectName)}&version=${encodeURIComponent(version)}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new DTClientError(`Failed to get project: ${response.statusText}`, response.status, body);
  }

  return (await response.json()) as DTProject;
}

/**
 * Get SBOM from a project
 *
 * @param projectName - Project name
 * @param version - Project version
 * @returns SBOM in CycloneDX format, or null if project not found
 */
export async function getSBOM(projectName: string, version: string): Promise<SBOM | null> {
  // First, get the project UUID
  const project = await getProject(projectName, version);
  if (!project) {
    return null;
  }

  const url = `${DT_BASE_URL}/api/v1/bom/cyclonedx/project/${project.uuid}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new DTClientError(`Failed to get SBOM: ${response.statusText}`, response.status, body);
  }

  return (await response.json()) as SBOM;
}

/**
 * Upload SBOM to Dependency-Track
 *
 * @param projectName - Project name
 * @param version - Project version
 * @param sbom - SBOM in CycloneDX format
 * @returns Project UUID
 */
export async function uploadSBOM(
  projectName: string,
  version: string,
  sbom: SBOM
): Promise<string> {
  const url = `${DT_BASE_URL}/api/v1/bom`;

  // Ensure SBOM has required 'version' field (BOM version, not project version)
  // If not set, try to get the current BOM version from DT and increment it
  if (!sbom.version) {
    const existingSBOM = await getSBOM(projectName, version);
    sbom.version = existingSBOM?.version ? existingSBOM.version + 1 : 1;
  }

  // Encode SBOM as base64
  const sbomJson = JSON.stringify(sbom);
  const sbomBase64 = Buffer.from(sbomJson).toString('base64');

  console.log(`SBOM JSON length: ${sbomJson.length} characters`);
  console.log(`SBOM base64 length: ${sbomBase64.length} characters`);
  console.log(`SBOM JSON preview (first 200 chars): ${sbomJson.substring(0, 200)}`);

  const payload = {
    projectName,
    projectVersion: version,
    autoCreate: true,
    bom: sbomBase64,
  };

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new DTClientError(`Failed to upload SBOM: ${response.statusText}`, response.status, body);
  }

  // Wait for project to be created/updated
  // The API returns a token, but we need to poll for the project
  await sleep(2000); // Give DT time to process

  const project = await getProject(projectName, version);
  if (!project) {
    throw new DTClientError('Project not found after SBOM upload');
  }

  return project.uuid;
}

/**
 * Get components list from a project
 *
 * @param projectUuid - Project UUID
 * @returns List of components
 */
export async function getComponents(projectUuid: string): Promise<DTComponent[]> {
  const url = `${DT_BASE_URL}/api/v1/component/project/${projectUuid}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new DTClientError(
      `Failed to get components: ${response.statusText}`,
      response.status,
      body
    );
  }

  return (await response.json()) as DTComponent[];
}

/**
 * Find component UUID by matching group, name, and version
 *
 * @param projectUuid - Project UUID
 * @param component - Component to find
 * @returns Component UUID, or null if not found
 */
export async function findComponentUuid(
  projectUuid: string,
  component: Component
): Promise<string | null> {
  const components = await getComponents(projectUuid);

  const match = components.find(
    (c) =>
      c.group === component.group && c.name === component.name && c.version === component.version
  );

  return match?.uuid || null;
}

/**
 * Set component property
 *
 * @param componentUuid - Component UUID
 * @param property - Property to set
 */
export async function setComponentProperty(
  componentUuid: string,
  property: DTComponentProperty
): Promise<void> {
  const url = `${DT_BASE_URL}/api/v1/component/${componentUuid}/property`;

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(property),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new DTClientError(
      `Failed to set component property: ${response.statusText}`,
      response.status,
      body
    );
  }
}

/**
 * Set component property by finding component first
 *
 * @param projectUuid - Project UUID
 * @param component - Component to set property for
 * @param propertyName - Property name
 * @param propertyValue - Property value
 */
export async function setComponentPropertyByComponent(
  projectUuid: string,
  component: Component,
  propertyName: string,
  propertyValue: string
): Promise<void> {
  const componentUuid = await findComponentUuid(projectUuid, component);

  if (!componentUuid) {
    throw new DTClientError(
      `Component not found: ${component.group || ''}:${component.name}:${component.version}`
    );
  }

  await setComponentProperty(componentUuid, {
    propertyName,
    propertyValue,
    propertyType: 'STRING',
  });
}
