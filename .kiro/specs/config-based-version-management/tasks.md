# Implementation Plan: Config-Based Version Management

## Overview

この実装計画は、OSS管理システムに設定ファイルベースのバージョン管理機能を追加するためのタスクを定義します。実装は段階的に進め、各ステップで動作を検証しながら進めます。

## Tasks

- [x] 1. Setup project dependencies and type definitions
  - Install `js-yaml` and `@types/js-yaml` dependencies
  - Install `fast-check` for property-based testing
  - Add type definitions for config structures to `scripts/types.ts`
  - _Requirements: 1.1, 1.2_

- [ ] 2. Implement Config Reader module
  - [x] 2.1 Create `scripts/config-reader.ts` with core functionality
    - Implement `configExists()` function to check file existence
    - Implement `readConfig()` function to read and parse YAML
    - Handle file not found, parse errors, and read errors
    - Return `ConfigReadResult` with success/error information
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [ ]* 2.2 Write property test for config file reading
    - **Property 1: Config file reading round-trip**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    - Generate random valid YAML with `pre-project-version`
    - Verify successful parsing and value extraction
  
  - [x] 2.3 Write unit tests for Config Reader
    - Test file exists scenario
    - Test file not found scenario
    - Test invalid YAML scenario
    - Test missing key scenario
    - Test empty value scenarios (null, undefined, "", whitespace)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Implement empty value detection
  - [x] 3.1 Create `isEmpty()` utility function in `scripts/version-resolver.ts`
    - Handle null, undefined, empty string, whitespace-only strings
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [ ]* 3.2 Write property test for empty value detection
    - **Property 2: Empty value detection**
    - **Validates: Requirements 2.3, 2.4, 2.5**
    - Generate various empty values
    - Verify all return true from `isEmpty()`

- [ ] 4. Implement Version Resolver module
  - [x] 4.1 Create `scripts/version-resolver.ts` with version resolution logic
    - Implement `resolvePreviousVersion()` function
    - Handle config file not found → first version
    - Handle missing/empty `pre-project-version` → first version
    - Handle DT SBOM not found → first version
    - Return `VersionResolution` with version, isFirstVersion, source, and reason
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 4.2 Write property test for first version detection
    - **Property 3: First version detection completeness**
    - **Validates: Requirements 2.1, 2.2, 2.5, 3.1, 3.4**
    - Generate various first version scenarios
    - Verify all result in `isFirstVersion: true` and empty SBOM usage
  
  - [ ]* 4.3 Write property test for DT API error handling
    - **Property 9: DT API error handling**
    - **Validates: Requirements 3.2, 3.3, 8.2**
    - Generate various DT error responses (404, network errors)
    - Verify all result in first version treatment with error logging
  
  - [x] 4.4 Write unit tests for Version Resolver
    - Test valid config with existing DT SBOM
    - Test config file not found
    - Test missing `pre-project-version` key
    - Test empty `pre-project-version` value
    - Test DT SBOM not found
    - Test DT API errors
    - _Requirements: 2.1, 2.2, 2.5, 3.1, 3.2, 3.3_

- [x] 5. Checkpoint - Ensure core logic tests pass
  - Run all unit tests and property tests
  - Verify error handling works correctly
  - Ask the user if questions arise

- [ ] 6. Implement CLI scripts
  - [x] 6.1 Create `scripts/config-reader-cli.ts`
    - Read config from current working directory
    - Output results to console
    - Exit with appropriate status codes
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 6.2 Create `scripts/version-resolver-cli.ts`
    - Accept project name and current version as arguments
    - Call version resolver with config result
    - Output resolution results to console
    - Set GitHub Actions outputs via GITHUB_OUTPUT
    - _Requirements: 2.1, 2.2, 3.1, 7.4, 8.3_
  
  - [x] 6.3 Write integration tests for CLI scripts
    - Test CLI with various config scenarios
    - Verify console output format
    - Verify GitHub Actions output format
    - _Requirements: 7.4, 8.3_

- [ ] 7. Implement logging functionality
  - [x] 7.1 Add logging to Config Reader
    - Log file found/not found
    - Log parse errors with file path and format guidance
    - _Requirements: 8.1, 8.5_
  
  - [x] 7.2 Add logging to Version Resolver
    - Log version source (config-file, first-version, dt-not-found)
    - Log reason for first version detection
    - Log DT API errors
    - _Requirements: 7.4, 8.2, 8.3, 8.4_
  
  - [ ]* 7.3 Write property tests for logging
    - **Property 7: Version source logging**
    - **Validates: Requirements 7.4, 8.3**
    - **Property 8: Error message completeness for invalid YAML**
    - **Validates: Requirements 8.1, 8.5**
    - **Property 10: First version reason logging**
    - **Validates: Requirements 8.4**
    - Generate various scenarios and verify log content

- [ ] 8. Update workflow files
  - [x] 8.1 Update `.github/workflows/reusable-pr-sbom-check.yml`
    - Add "Read version config" step
    - Add "Resolve previous version" step
    - Update "Get previous SBOM from Dependency-Track" step to use resolved version
    - Use `is_first_version` output to determine empty SBOM usage
    - _Requirements: 6.1, 6.2, 7.1, 7.3_
  
  - [x] 8.2 Update `.github/workflows/reusable-tag-sbom-review.yml`
    - Add "Read version config" step
    - Add "Resolve previous version" step with Git tag as current version
    - Update "Get previous SBOM from Dependency-Track" step to use resolved version
    - Use `is_first_version` output to determine empty SBOM usage
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 7.2, 7.3_

- [x] 9. Checkpoint - Ensure workflow integration works
  - Build TypeScript files
  - Verify CLI scripts are executable
  - Test workflow changes locally if possible
  - Ask the user if questions arise

- [ ] 10. Implement diff generation for first version
  - [x] 10.1 Update diff checker to handle first version scenario
    - When previous SBOM is empty, mark all components as "added"
    - Ensure no components are marked as "removed" or "updated"
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 10.2 Write property test for first version diff
    - **Property 4: First version diff invariant**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Generate random SBOMs
    - Compare against empty SBOM
    - Verify all components marked as "added"

- [x] 11. Update DT client for version consistency
  - [x] 11.1 Verify DT upload uses correct version
    - Ensure `uploadSBOM()` uses the provided version parameter
    - Verify version matches Git tag in workflow context
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 11.2 Write property test for version consistency
    - **Property 5: Version consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Generate random version strings
    - Verify DT registration uses same version

- [ ] 12. Add config file path resolution test
  - [ ]* 12.1 Write property test for path resolution
    - **Property 6: Config file path resolution**
    - **Validates: Requirements 6.2**
    - Generate random repository root paths
    - Verify correct config file path construction

- [ ] 13. Update documentation
  - [x] 13.1 Update README.md
    - Add section on configuration file
    - Add usage examples with `oss-management-system.yml`
    - Add migration guide from environment variable approach
    - _Requirements: 6.1, 6.2_
  
  - [ ] 13.2 Update DESIGN.md
    - Update system processing flow to include config file reading
    - Add config file specification section
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 13.3 Create CONFIGURATION.md
    - Document all configuration options
    - Provide troubleshooting guide
    - Include examples for different scenarios
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 14. Final checkpoint - Comprehensive testing
  - Run all unit tests
  - Run all property tests (minimum 100 iterations each)
  - Verify all tests pass
  - Review test coverage
  - Ask the user if questions arise

- [ ] 15. Create example configuration file
  - [x] 15.1 Create example `oss-management-system.yml` in docs
    - Include comments explaining each field
    - Provide examples for different use cases
    - _Requirements: 1.1, 1.2, 1.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- All TypeScript code should be compiled before testing workflows
- The config file should be read from the calling repository root, not the OSS management system repository
