"use strict";
/**
 * Dependency-Track API Client
 *
 * Provides functions to interact with Dependency-Track API:
 * - Get SBOM from a project
 * - Upload SBOM to create/update a project
 * - Get components list from a project
 * - Set component properties
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DTClientError = void 0;
exports.getProject = getProject;
exports.getSBOM = getSBOM;
exports.uploadSBOM = uploadSBOM;
exports.getComponents = getComponents;
exports.findComponentUuid = findComponentUuid;
exports.setComponentProperty = setComponentProperty;
exports.setComponentPropertyByComponent = setComponentPropertyByComponent;
// ============================================================================
// Configuration
// ============================================================================
const DT_BASE_URL = process.env.DT_BASE_URL || "http://localhost:8081";
const DT_API_KEY = process.env.DT_API_KEY || "";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
// ============================================================================
// Error Classes
// ============================================================================
class DTClientError extends Error {
    constructor(message, statusCode, responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.name = "DTClientError";
    }
}
exports.DTClientError = DTClientError;
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Make HTTP request with retry logic for 5xx errors
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    let lastError = null;
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
                console.warn(`DT API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`);
                await sleep(delay);
                continue;
            }
            return response;
        }
        catch (error) {
            lastError = error;
            if (attempt < retries) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                console.warn(`DT API request failed: ${lastError.message}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`);
                await sleep(delay);
                continue;
            }
        }
    }
    throw new DTClientError(`Failed after ${retries} retries: ${lastError?.message || "Unknown error"}`);
}
/**
 * Get common headers for DT API requests
 */
function getHeaders() {
    return {
        "Content-Type": "application/json",
        "X-Api-Key": DT_API_KEY,
    };
}
// ============================================================================
// API Functions
// ============================================================================
/**
 * Get project by name and version
 */
async function getProject(projectName, version) {
    const url = `${DT_BASE_URL}/api/v1/project/lookup?name=${encodeURIComponent(projectName)}&version=${encodeURIComponent(version)}`;
    const response = await fetchWithRetry(url, {
        method: "GET",
        headers: getHeaders(),
    });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        const body = await response.text();
        throw new DTClientError(`Failed to get project: ${response.statusText}`, response.status, body);
    }
    return (await response.json());
}
/**
 * Get SBOM from a project
 *
 * @param projectName - Project name
 * @param version - Project version
 * @returns SBOM in CycloneDX format, or null if project not found
 */
async function getSBOM(projectName, version) {
    // First, get the project UUID
    const project = await getProject(projectName, version);
    if (!project) {
        return null;
    }
    const url = `${DT_BASE_URL}/api/v1/bom/cyclonedx/project/${project.uuid}`;
    const response = await fetchWithRetry(url, {
        method: "GET",
        headers: getHeaders(),
    });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        const body = await response.text();
        throw new DTClientError(`Failed to get SBOM: ${response.statusText}`, response.status, body);
    }
    return (await response.json());
}
/**
 * Upload SBOM to Dependency-Track
 *
 * @param projectName - Project name
 * @param version - Project version
 * @param sbom - SBOM in CycloneDX format
 * @returns Project UUID
 */
async function uploadSBOM(projectName, version, sbom) {
    const url = `${DT_BASE_URL}/api/v1/bom`;
    // Encode SBOM as base64
    const sbomJson = JSON.stringify(sbom);
    const sbomBase64 = Buffer.from(sbomJson).toString("base64");
    const payload = {
        projectName,
        projectVersion: version,
        autoCreate: true,
        bom: sbomBase64,
    };
    const response = await fetchWithRetry(url, {
        method: "PUT",
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
        throw new DTClientError("Project not found after SBOM upload");
    }
    return project.uuid;
}
/**
 * Get components list from a project
 *
 * @param projectUuid - Project UUID
 * @returns List of components
 */
async function getComponents(projectUuid) {
    const url = `${DT_BASE_URL}/api/v1/component/project/${projectUuid}`;
    const response = await fetchWithRetry(url, {
        method: "GET",
        headers: getHeaders(),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new DTClientError(`Failed to get components: ${response.statusText}`, response.status, body);
    }
    return (await response.json());
}
/**
 * Find component UUID by matching group, name, and version
 *
 * @param projectUuid - Project UUID
 * @param component - Component to find
 * @returns Component UUID, or null if not found
 */
async function findComponentUuid(projectUuid, component) {
    const components = await getComponents(projectUuid);
    const match = components.find((c) => c.group === component.group &&
        c.name === component.name &&
        c.version === component.version);
    return match?.uuid || null;
}
/**
 * Set component property
 *
 * @param componentUuid - Component UUID
 * @param property - Property to set
 */
async function setComponentProperty(componentUuid, property) {
    const url = `${DT_BASE_URL}/api/v1/component/${componentUuid}/property`;
    const response = await fetchWithRetry(url, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(property),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new DTClientError(`Failed to set component property: ${response.statusText}`, response.status, body);
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
async function setComponentPropertyByComponent(projectUuid, component, propertyName, propertyValue) {
    const componentUuid = await findComponentUuid(projectUuid, component);
    if (!componentUuid) {
        throw new DTClientError(`Component not found: ${component.group || ""}:${component.name}:${component.version}`);
    }
    await setComponentProperty(componentUuid, {
        propertyName,
        propertyValue,
        propertyType: "STRING",
    });
}
//# sourceMappingURL=dt-client.js.map