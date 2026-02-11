# Design Document: Config-Based Version Management

## Overview

この設計書は、OSS管理システムにおける設定ファイルベースのバージョン管理機能の実装方法を定義します。現在のシステムは環境変数`PREVIOUS_VERSION`またはGitタグから比較対象バージョンを取得していますが、呼び出し元リポジトリの`oss-management-system.yml`設定ファイルから読み取る方式に変更します。

### 設計の主要な目標

1. **明示的なバージョン管理**: 開発者が比較対象バージョンを設定ファイルで明示的に指定できる
2. **最初のバージョンの適切な処理**: 設定ファイルが存在しない場合やDTからSBOMが取得できない場合を適切に処理
3. **Reusable Workflowsとの互換性**: 呼び出し元リポジトリのファイルに正しくアクセス
4. **既存システムとの統合**: 既存のワークフローとスクリプトに最小限の変更で統合

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│ Calling Repository (呼び出し元リポジトリ)                      │
│                                                               │
│  ├── oss-management-system.yml  ← 設定ファイル                │
│  ├── .github/workflows/                                       │
│  │   └── sbom-check.yml  ← Reusable Workflowを呼び出す        │
│  └── (プロジェクトのソースコード)                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ workflow_call
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ OSS Management System Repository                             │
│                                                               │
│  ├── .github/workflows/                                       │
│  │   ├── reusable-pr-sbom-check.yml                          │
│  │   └── reusable-tag-sbom-review.yml                        │
│  ├── scripts/                                                 │
│  │   ├── config-reader.ts  ← 新規: 設定ファイル読み取り       │
│  │   ├── version-resolver.ts  ← 新規: バージョン解決ロジック  │
│  │   └── dt-client.ts  (既存)                                │
│  └── config/                                                  │
│      └── license-guidelines.yml                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ API calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Dependency-Track (DT)                                         │
│  - SBOM storage and retrieval                                │
│  - Project version management                                │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

```
1. Workflow Trigger (PR or Tag)
   ↓
2. Checkout Calling Repository
   ↓
3. Read oss-management-system.yml
   ↓
4. Determine Previous Version
   ├─ Config file exists & valid → Use pre-project-version
   ├─ Config file missing/invalid → First Version
   └─ DT retrieval fails → First Version
   ↓
5. Generate Current SBOM (Syft)
   ↓
6. Retrieve Previous SBOM from DT
   ├─ Found → Use for comparison
   └─ Not found → Use empty SBOM (First Version)
   ↓
7. Compare SBOMs
   ↓
8. Generate Report/Issue
```

## Components and Interfaces

### 1. Config Reader Module (`config-reader.ts`)

設定ファイルを読み取り、パースする責務を持つモジュール。

#### Interface

```typescript
/**
 * Configuration file structure
 */
interface OSSManagementConfig {
  preProjectVersion?: string | null;
}

/**
 * Result of config file reading
 */
interface ConfigReadResult {
  success: boolean;
  config?: OSSManagementConfig;
  error?: string;
  filePath: string;
}

/**
 * Read and parse oss-management-system.yml from the calling repository
 * 
 * @param repoRoot - Root directory of the calling repository
 * @returns ConfigReadResult
 */
function readConfig(repoRoot: string): ConfigReadResult;

/**
 * Check if the config file exists
 * 
 * @param repoRoot - Root directory of the calling repository
 * @returns true if file exists, false otherwise
 */
function configExists(repoRoot: string): boolean;
```

#### Implementation Details

- ファイルパス: `${repoRoot}/oss-management-system.yml`
- YAMLパーサー: `js-yaml`ライブラリを使用
- エラーハンドリング:
  - ファイルが存在しない場合: `success: false`, `error: "File not found"`
  - YAMLパースエラー: `success: false`, `error: "Invalid YAML: <詳細>"`
  - ファイル読み取りエラー: `success: false`, `error: "Read error: <詳細>"`

### 2. Version Resolver Module (`version-resolver.ts`)

設定ファイルとDTからの情報を元に、使用すべきバージョンを決定する責務を持つモジュール。

#### Interface

```typescript
/**
 * Version resolution result
 */
interface VersionResolution {
  previousVersion: string | null;
  isFirstVersion: boolean;
  source: 'config-file' | 'first-version' | 'dt-not-found';
  reason?: string;
}

/**
 * Resolve the previous version to use for comparison
 * 
 * @param configResult - Result from config reader
 * @param projectName - Project name for DT lookup
 * @param currentVersion - Current version (Git tag)
 * @returns VersionResolution
 */
async function resolvePreviousVersion(
  configResult: ConfigReadResult,
  projectName: string,
  currentVersion: string
): Promise<VersionResolution>;

/**
 * Check if a value is considered empty
 * 
 * @param value - Value to check
 * @returns true if empty (null, undefined, empty string, or whitespace only)
 */
function isEmpty(value: string | null | undefined): boolean;
```

#### Implementation Details

**バージョン解決ロジック:**

1. 設定ファイルが読み取れない場合:
   - `isFirstVersion: true`
   - `source: 'first-version'`
   - `reason: 'Config file not found or invalid'`

2. `pre-project-version`が空の場合:
   - `isEmpty()`関数でチェック（null, undefined, 空文字列, 空白のみ）
   - `isFirstVersion: true`
   - `source: 'first-version'`
   - `reason: 'pre-project-version is empty'`

3. `pre-project-version`が有効な値の場合:
   - DTから該当バージョンのSBOMを取得試行
   - 取得成功: `isFirstVersion: false`, `source: 'config-file'`
   - 取得失敗: `isFirstVersion: true`, `source: 'dt-not-found'`, `reason: 'SBOM not found in DT'`

### 3. Workflow Integration

既存のワークフローファイルに統合する変更。

#### Modified: `.github/workflows/reusable-pr-sbom-check.yml`

**変更点:**

1. 新しいステップ「Read version config」を追加
2. 「Get previous SBOM from Dependency-Track」ステップを更新

```yaml
- name: Read version config
  id: read-config
  run: |
    node .oss-management/dist/scripts/config-reader-cli.js
  continue-on-error: true

- name: Resolve previous version
  id: resolve-version
  run: |
    node .oss-management/dist/scripts/version-resolver-cli.js \
      "${{ github.event.repository.name }}" \
      "${{ github.sha }}"
  env:
    DT_BASE_URL: ${{ secrets.DT_BASE_URL }}
    DT_API_KEY: ${{ secrets.DT_API_KEY }}

- name: Get previous SBOM from Dependency-Track
  id: get-previous-sbom
  run: |
    PREVIOUS_VERSION="${{ steps.resolve-version.outputs.previous_version }}"
    IS_FIRST_VERSION="${{ steps.resolve-version.outputs.is_first_version }}"
    
    if [ "$IS_FIRST_VERSION" = "true" ]; then
      echo "First version detected, using empty SBOM"
      echo '{"bomFormat":"CycloneDX","specVersion":"1.4","version":1,"components":[]}' > previous-sbom.json
    else
      node .oss-management/dist/scripts/dt-client-cli.js get-sbom \
        "${{ github.event.repository.name }}" \
        "$PREVIOUS_VERSION" \
        previous-sbom.json
    fi
  env:
    DT_BASE_URL: ${{ secrets.DT_BASE_URL }}
    DT_API_KEY: ${{ secrets.DT_API_KEY }}
```

#### Modified: `.github/workflows/reusable-tag-sbom-review.yml`

同様の変更を適用。ただし、`currentVersion`はGitタグから取得:

```yaml
- name: Resolve previous version
  id: resolve-version
  run: |
    node .oss-management/dist/scripts/version-resolver-cli.js \
      "${{ github.event.repository.name }}" \
      "${{ github.ref_name }}"
  env:
    DT_BASE_URL: ${{ secrets.DT_BASE_URL }}
    DT_API_KEY: ${{ secrets.DT_API_KEY }}
```

### 4. CLI Scripts

ワークフローから呼び出すためのCLIスクリプト。

#### `config-reader-cli.ts`

```typescript
#!/usr/bin/env node

import { readConfig } from './config-reader';

const repoRoot = process.cwd();
const result = readConfig(repoRoot);

if (result.success) {
  console.log(`✓ Config file found: ${result.filePath}`);
  console.log(`  pre-project-version: ${result.config?.preProjectVersion || '(not set)'}`);
  process.exit(0);
} else {
  console.log(`✗ Config file error: ${result.error}`);
  process.exit(1);
}
```

#### `version-resolver-cli.ts`

```typescript
#!/usr/bin/env node

import { readConfig } from './config-reader';
import { resolvePreviousVersion } from './version-resolver';
import * as fs from 'fs';

async function main() {
  const [projectName, currentVersion] = process.argv.slice(2);
  
  if (!projectName || !currentVersion) {
    console.error('Usage: version-resolver-cli.js <project-name> <current-version>');
    process.exit(1);
  }
  
  const repoRoot = process.cwd();
  const configResult = readConfig(repoRoot);
  
  const resolution = await resolvePreviousVersion(
    configResult,
    projectName,
    currentVersion
  );
  
  // Output for GitHub Actions
  console.log(`Previous version: ${resolution.previousVersion || '(none)'}`);
  console.log(`Is first version: ${resolution.isFirstVersion}`);
  console.log(`Source: ${resolution.source}`);
  if (resolution.reason) {
    console.log(`Reason: ${resolution.reason}`);
  }
  
  // Set outputs for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `previous_version=${resolution.previousVersion || ''}\n`
    );
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `is_first_version=${resolution.isFirstVersion}\n`
    );
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version_source=${resolution.source}\n`
    );
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
```

## Data Models

### Configuration File Format

```yaml
# ファイル名: oss-management-system.yml
# 配置場所: 呼び出し元リポジトリのルート

# 差分比較時にDTから取得するプロジェクトバージョン
pre-project-version: v1.0.0
```

**フィールド定義:**

- `pre-project-version` (string, optional): 比較対象とする過去のバージョン
  - 形式: 任意の文字列（通常はGitタグと同じ形式、例: `v1.0.0`, `1.0.0`）
  - 空の場合: 最初のバージョンとして扱う
  - 未定義の場合: 最初のバージョンとして扱う

### Internal Data Structures

```typescript
// Config file structure
interface OSSManagementConfig {
  preProjectVersion?: string | null;
}

// Config read result
interface ConfigReadResult {
  success: boolean;
  config?: OSSManagementConfig;
  error?: string;
  filePath: string;
}

// Version resolution result
interface VersionResolution {
  previousVersion: string | null;
  isFirstVersion: boolean;
  source: 'config-file' | 'first-version' | 'dt-not-found';
  reason?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Config file reading round-trip

*For any* valid `oss-management-system.yml` file with a `pre-project-version` value, reading and parsing the file should successfully extract the version value.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Empty value detection

*For any* value that is null, undefined, empty string, or consists only of whitespace characters, the `isEmpty()` function should return true.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 3: First version detection completeness

*For any* scenario where the config file doesn't exist, the `pre-project-version` key is missing, the value is empty, or DT returns no SBOM, the system should treat it as first version and use an empty SBOM for comparison.

**Validates: Requirements 2.1, 2.2, 2.5, 3.1, 3.4**

### Property 4: First version diff invariant

*For any* SBOM compared against an empty SBOM (first version scenario), all components in the diff result should be marked as "added", and no components should be marked as "removed" or "updated".

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: Version consistency

*For any* SBOM upload to DT, the version used for registration should match the Git tag (current version).

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Config file path resolution

*For any* repository root path, the config reader should construct the config file path as `${repoRoot}/oss-management-system.yml`, not using any path from the OSS management system repository.

**Validates: Requirements 6.2**

### Property 7: Version source logging

*For any* version resolution result, the log output should clearly indicate the source of the version (config-file, first-version, or dt-not-found).

**Validates: Requirements 7.4, 8.3**

### Property 8: Error message completeness for invalid YAML

*For any* invalid YAML file, the error message should include both the file path and guidance on the correct format.

**Validates: Requirements 8.1, 8.5**

### Property 9: DT API error handling

*For any* DT API error (404, network error, or other failures), the system should log the error and treat the current version as first version.

**Validates: Requirements 3.2, 3.3, 8.2**

### Property 10: First version reason logging

*For any* scenario where the system treats the current version as first version, the log should include the specific reason (missing file, missing key, empty value, or DT retrieval failure).

**Validates: Requirements 8.4**

### Property 11: Parse error handling

*For any* YAML parsing failure, the system should return a failed ConfigReadResult with an error message and treat it as first version.

**Validates: Requirements 1.5**

## Error Handling

### Error Categories

1. **Configuration File Errors**
   - File not found: Log info message, treat as first version
   - Invalid YAML syntax: Log error with file path and format guidance, treat as first version
   - File read permission error: Log error, treat as first version

2. **DT API Errors**
   - 404 Not Found: Log info message, treat as first version
   - Network errors: Log error with connection details, treat as first version
   - 5xx Server errors: Retry with exponential backoff (existing behavior), then treat as first version
   - Authentication errors: Log error, fail workflow (existing behavior)

3. **Version Resolution Errors**
   - Empty version value: Log info message, treat as first version
   - Invalid version format: Log warning, attempt to use as-is (DT will validate)

### Error Recovery Strategy

すべてのエラーケースで、システムは「最初のバージョン」として扱うことでワークフローを継続します。これにより:

- ワークフローが途中で失敗しない
- 開発者は常にSBOM差分レポートを受け取れる
- エラーの原因は明確にログに記録される

### Logging Strategy

**ログレベル:**

- **INFO**: 正常な動作（設定ファイル読み取り成功、最初のバージョン検出）
- **WARN**: 予期される問題（設定ファイル未設定、DTにSBOMなし）
- **ERROR**: 予期しない問題（YAML構文エラー、DT接続エラー）

**ログフォーマット:**

```
[INFO] Config file found: /path/to/oss-management-system.yml
[INFO] pre-project-version: v1.0.0
[INFO] Previous version resolved: v1.0.0 (source: config-file)

[WARN] Config file not found: /path/to/oss-management-system.yml
[INFO] Treating as first version (reason: config file not found)

[ERROR] Failed to parse config file: /path/to/oss-management-system.yml
[ERROR] YAML syntax error at line 3: unexpected token
[ERROR] Expected format:
  pre-project-version: v1.0.0
[INFO] Treating as first version (reason: invalid YAML)

[WARN] SBOM not found in DT for version v1.0.0
[INFO] Treating as first version (reason: DT SBOM not found)
```

## Testing Strategy

### Dual Testing Approach

このプロジェクトでは、ユニットテストとプロパティベーステストの両方を使用します:

- **ユニットテスト**: 特定の例、エッジケース、エラー条件を検証
- **プロパティベーステスト**: すべての入力にわたる普遍的な特性を検証

両方のアプローチは補完的であり、包括的なカバレッジに必要です。

### Unit Testing

**対象:**

1. **Config Reader**
   - 設定ファイルが存在する場合の読み取り
   - 設定ファイルが存在しない場合の処理
   - 無効なYAMLの処理
   - 空の値の処理（null, undefined, "", "  "）

2. **Version Resolver**
   - 有効な設定からのバージョン解決
   - 最初のバージョンの検出（各ケース）
   - DTエラーハンドリング
   - ログ出力の検証

3. **Integration Tests**
   - ワークフロー全体の動作（モックDT使用）
   - CLIスクリプトの動作

**テストフレームワーク:** Jest

**モック戦略:**
- ファイルシステム操作: `fs`モジュールをモック
- DT API呼び出し: `dt-client`モジュールをモック
- 環境変数: `process.env`を制御

### Property-Based Testing

**テストライブラリ:** fast-check (TypeScript用)

**設定:**
- 各プロパティテストは最低100回の反復を実行
- 各テストは設計書のプロパティを参照するタグを含む
- タグ形式: `Feature: config-based-version-management, Property N: <property text>`

**プロパティテスト:**

1. **Property 1: Config file reading round-trip**
   - ランダムな有効なYAML構造を生成
   - `pre-project-version`キーを含む
   - 読み取りとパースが成功することを検証

2. **Property 2: Empty value detection**
   - null, undefined, "", 空白文字のみの文字列を生成
   - すべてが`isEmpty()`でtrueを返すことを検証

3. **Property 3: First version detection completeness**
   - 様々な「最初のバージョン」シナリオを生成
   - すべてで`isFirstVersion: true`となることを検証

4. **Property 4: First version diff invariant**
   - ランダムなSBOMを生成
   - 空のSBOMと比較
   - すべてのコンポーネントが"added"とマークされることを検証

5. **Property 5: Version consistency**
   - ランダムなバージョン文字列を生成
   - DT登録時に同じバージョンが使用されることを検証

6. **Property 6: Config file path resolution**
   - ランダムなリポジトリルートパスを生成
   - 正しいパスが構築されることを検証

7. **Property 7: Version source logging**
   - 様々なバージョン解決結果を生成
   - ログにソース情報が含まれることを検証

8. **Property 8: Error message completeness for invalid YAML**
   - 無効なYAMLを生成
   - エラーメッセージにファイルパスとガイダンスが含まれることを検証

9. **Property 9: DT API error handling**
   - 様々なDTエラーレスポンスを生成
   - すべてで最初のバージョンとして扱われることを検証

10. **Property 10: First version reason logging**
    - 様々な最初のバージョンシナリオを生成
    - ログに理由が含まれることを検証

11. **Property 11: Parse error handling**
    - 無効なYAMLを生成
    - 失敗したConfigReadResultが返されることを検証

### Integration Testing

**GitHub Actions Workflow Testing:**

実際のGitHub Actions環境でのテストは、以下の方法で実施:

1. テスト用リポジトリを作成
2. 様々な設定ファイルパターンをテスト
3. ワークフローログを検証

**テストケース:**
- 設定ファイルあり、有効なバージョン
- 設定ファイルなし
- 設定ファイルあり、空のバージョン
- 設定ファイルあり、無効なYAML
- DTにSBOMなし

## Implementation Notes

### Dependencies

**新規依存関係:**

```json
{
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "fast-check": "^3.15.0",
    "@types/js-yaml": "^4.0.9"
  }
}
```

### File Structure

```
scripts/
├── config-reader.ts          # 新規
├── config-reader-cli.ts      # 新規
├── version-resolver.ts       # 新規
├── version-resolver-cli.ts   # 新規
├── dt-client.ts              # 既存（変更なし）
└── types.ts                  # 既存（型定義追加）

tests/
├── config-reader.test.ts     # 新規
├── version-resolver.test.ts  # 新規
├── config-reader.property.test.ts     # 新規
└── version-resolver.property.test.ts  # 新規
```

### Backward Compatibility

この変更は既存のシステムと後方互換性があります:

- 環境変数`PREVIOUS_VERSION`は削除されますが、設定ファイルが優先されます
- 設定ファイルがない場合、システムは最初のバージョンとして扱います（安全なフォールバック）
- 既存のDT APIクライアントは変更不要

### Migration Path

既存のユーザーが新しいシステムに移行する手順:

1. 呼び出し元リポジトリのルートに`oss-management-system.yml`を作成
2. `pre-project-version`に前回リリースのバージョンを設定
3. 環境変数`PREVIOUS_VERSION`の設定を削除（オプション）
4. 次回のPRまたはタグ作成時に新しいロジックが適用される

### Performance Considerations

- 設定ファイルの読み取りは同期的に実行（小さいファイルのため問題なし）
- YAMLパースはキャッシュ不要（ワークフロー実行ごとに1回のみ）
- DT API呼び出しは既存の実装を使用（リトライロジック含む）

## Documentation Updates

以下のドキュメントを更新する必要があります:

1. **README.md**
   - 設定ファイルの説明を追加
   - 使用例を更新
   - マイグレーション手順を追加

2. **DESIGN.md**
   - システムの処理フローを更新
   - 設定ファイルの仕様を追加

3. **新規: CONFIGURATION.md**
   - 設定ファイルの詳細な説明
   - すべての設定オプション
   - トラブルシューティングガイド

## Future Enhancements

将来的に追加可能な機能:

1. **複数の比較対象バージョン**: 複数のバージョンとの差分を同時に表示
2. **バージョン自動推論**: DTから最新のバージョンを自動取得
3. **設定ファイルのバリデーション**: GitHub Actionで設定ファイルの妥当性を事前チェック
4. **設定ファイルのスキーマ定義**: JSON Schemaで設定ファイルの構造を定義
