# Requirements Document

## Introduction

このドキュメントは、OSS管理システムにおける設定ファイルベースのバージョン管理機能の要件を定義します。現在のシステムでは、比較対象のSBOMバージョンを環境変数`PREVIOUS_VERSION`またはGitタグから取得していますが、呼び出し元リポジトリのルートに配置される`oss-management-system.yml`設定ファイルから比較対象バージョンを読み取る方式に変更します。

このシステムはGitHub Actions (GHA) のReusable Workflowsとして実装され、他のリポジトリから呼び出されて利用されます。

## Glossary

- **System**: OSS管理システム全体を指す
- **Config_File**: 呼び出し元リポジトリのルートに配置される`oss-management-system.yml`ファイル
- **Calling_Repository**: このOSS管理システムのGHAを呼び出す側のリポジトリ
- **DT**: Dependency-Track（SBOM中央管理システム）
- **SBOM**: Software Bill of Materials（ソフトウェア部品表）
- **GHA**: GitHub Actions
- **Reusable_Workflow**: 他のリポジトリから呼び出し可能なGitHub Actionsワークフロー
- **Previous_Version**: 比較対象となる過去のプロジェクトバージョン
- **Current_Version**: 現在のプロジェクトバージョン（Gitタグと同じ）
- **First_Version**: 最初のバージョン（比較対象が存在しない状態）

## Requirements

### Requirement 1: 設定ファイルからの比較対象バージョン読み取り

**User Story:** As a developer, I want the system to read the comparison target version from a configuration file, so that I can explicitly control which version to compare against.

#### Acceptance Criteria

1. WHEN the System reads version information, THE System SHALL check for the existence of `oss-management-system.yml` in the Calling_Repository root
2. WHEN `oss-management-system.yml` exists, THE System SHALL parse it as a YAML file
3. WHEN the Config_File is parsed, THE System SHALL extract the value of the `pre-project-version` key
4. WHEN the `pre-project-version` value is a non-empty string, THE System SHALL use it as the Previous_Version
5. WHEN the Config_File parsing fails, THE System SHALL log an error message and treat it as First_Version

### Requirement 2: 最初のバージョンの判定

**User Story:** As a developer, I want the system to correctly identify the first version, so that all OSS components are treated as new additions when there is no previous version to compare against.

#### Acceptance Criteria

1. WHEN `oss-management-system.yml` does not exist in the Calling_Repository root, THE System SHALL treat the current version as First_Version
2. WHEN `oss-management-system.yml` exists but does not contain the `pre-project-version` key, THE System SHALL treat the current version as First_Version
3. WHEN the `pre-project-version` value is an empty string, THE System SHALL treat the current version as First_Version
4. WHEN the `pre-project-version` value is null, THE System SHALL treat the current version as First_Version
5. WHEN the `pre-project-version` value consists only of whitespace characters, THE System SHALL treat the current version as First_Version

### Requirement 3: DTからのSBOM取得失敗時の処理

**User Story:** As a developer, I want the system to handle cases where the previous SBOM cannot be retrieved from DT, so that the workflow can continue without errors.

#### Acceptance Criteria

1. WHEN the System attempts to retrieve an SBOM from DT using Previous_Version and the SBOM does not exist, THE System SHALL treat the current version as First_Version
2. WHEN the DT API returns a 404 error, THE System SHALL treat the current version as First_Version
3. WHEN the DT API returns a network error, THE System SHALL log the error and treat the current version as First_Version
4. WHEN the current version is treated as First_Version, THE System SHALL use an empty SBOM for comparison

### Requirement 4: 最初のバージョンでの差分処理

**User Story:** As a developer, I want all OSS components to be treated as new additions in the first version, so that the review process correctly reflects that this is the initial release.

#### Acceptance Criteria

1. WHEN the current version is First_Version, THE System SHALL generate a diff result where all components are marked as "added"
2. WHEN the current version is First_Version, THE System SHALL not mark any components as "removed" or "updated"
3. WHEN the current version is First_Version, THE System SHALL include all components from the current SBOM in the diff result

### Requirement 5: DTへのバージョン登録

**User Story:** As a developer, I want the system to register the SBOM in DT with the same version as the Git tag, so that version management is consistent across systems.

#### Acceptance Criteria

1. WHEN the System uploads an SBOM to DT, THE System SHALL use the Git tag as the Current_Version
2. WHEN a Git tag is created, THE System SHALL extract the tag name as the Current_Version
3. WHEN the System registers a project in DT, THE System SHALL set the project version to match the Current_Version

### Requirement 6: Reusable Workflowsとしての動作

**User Story:** As a developer, I want the system to work as a Reusable Workflow, so that multiple repositories can use this OSS management system without duplicating code.

#### Acceptance Criteria

1. WHEN the GHA is invoked as a Reusable_Workflow, THE System SHALL access files in the Calling_Repository
2. WHEN the System reads the Config_File, THE System SHALL read it from the Calling_Repository root, not from the OSS management system repository
3. WHEN the System generates an SBOM, THE System SHALL generate it from the Calling_Repository codebase
4. WHEN the System checks out the OSS management scripts, THE System SHALL use a separate directory to avoid conflicts with the Calling_Repository

### Requirement 7: 既存ワークフローとの統合

**User Story:** As a developer, I want the new configuration-based version management to integrate seamlessly with existing workflows, so that the transition is smooth and backward compatible.

#### Acceptance Criteria

1. WHEN the PR SBOM check workflow runs, THE System SHALL use the Config_File to determine Previous_Version
2. WHEN the tag SBOM review workflow runs, THE System SHALL use the Config_File to determine Previous_Version
3. WHEN the Config_File is not available, THE System SHALL fall back to treating it as First_Version
4. WHEN the System logs version information, THE System SHALL clearly indicate whether the version was read from the Config_File or treated as First_Version

### Requirement 8: エラーハンドリングとログ出力

**User Story:** As a developer, I want clear error messages and logs, so that I can troubleshoot issues when the configuration is incorrect or when DT is unavailable.

#### Acceptance Criteria

1. WHEN the Config_File cannot be parsed as valid YAML, THE System SHALL log a descriptive error message including the file path
2. WHEN the DT API is unreachable, THE System SHALL log the connection error and continue with First_Version logic
3. WHEN the Previous_Version is determined, THE System SHALL log the source of the version (Config_File or First_Version)
4. WHEN the System treats the current version as First_Version, THE System SHALL log the reason (missing file, missing key, empty value, or DT retrieval failure)
5. WHEN the Config_File exists but has invalid format, THE System SHALL provide guidance on the correct format in the error message
