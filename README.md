# OSS管理システム

GitHub ActionsとDependency-Trackを活用した、OSS(オープンソースソフトウェア)管理の自動化システムです。SBOM(Software Bill of Materials)の自動生成、差分検出、ライセンスガイドの提示、見直し・承認プロセスの管理を通じて、OSSコンプライアンス管理を効率化します。

## 主な機能

- **SBOM自動生成**: Syftを使用してCycloneDX形式のSBOMを自動生成
- **差分検出**: 前回リリースとの差分を自動比較し、変更されたOSSコンポーネントのみを抽出
- **ライセンスガイド**: ライセンスごとの対応ガイドラインを自動表示
- **PR自動コメント**: PRに差分情報とガイドラインを自動投稿
- **見直し・承認フロー**: GitHub Issueを使った構造化された見直し・承認プロセス
- **Dependency-Track連携**: 承認後のSBOMを自動的にDependency-Trackに登録

## システム構成

```
┌─────────────┐
│ Pull Request│
└──────┬──────┘
       │ trigger
       ▼
┌─────────────────────────────────┐
│ PR Workflow                     │
│ - SBOM生成                      │
│ - 差分比較                      │
│ - PRコメント投稿                │
└─────────────────────────────────┘

┌─────────────┐
│ Tag Creation│
└──────┬──────┘
       │ trigger
       ▼
┌─────────────────────────────────┐
│ Tag Workflow                    │
│ - SBOM生成                      │
│ - 差分比較                      │
│ - 見直しIssue作成               │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Review Issue (手動クローズ)     │
└──────┬──────────────────────────┘
       │ trigger
       ▼
┌─────────────────────────────────┐
│ Review Close Workflow           │
│ - 見直し結果抽出                │
│ - 承認Issue作成 (必要な場合)    │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Approval Issue (手動クローズ)   │
└──────┬──────────────────────────┘
       │ trigger
       ▼
┌─────────────────────────────────┐
│ Approval Close Workflow         │
│ - DT登録                        │
│ - コンポーネントプロパティ設定  │
└─────────────────────────────────┘
```

## セットアップ

### 前提条件

- Node.js 20以上
- GitHub リポジトリ
- Dependency-Track インスタンス (オプション)

### インストール

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd oss-management-system
```

2. 依存関係をインストール:
```bash
npm install
```

3. TypeScriptをビルド:
```bash
npm run build
```

### 環境変数の設定

GitHub リポジトリのSettings > Secrets and variablesで以下のシークレットを設定してください:

#### 必須

- `GITHUB_TOKEN`: GitHub Actions が自動的に提供 (設定不要)

#### Dependency-Track連携用 (オプション)

- `DT_BASE_URL`: Dependency-TrackのベースURL (例: `https://dtrack.example.com`)
- `DT_API_KEY`: Dependency-TrackのAPIキー

Dependency-Track連携を使用しない場合、システムは初回リリースとして動作し、すべてのコンポーネントを新規として扱います。

### ライセンスガイドラインの設定

`config/license-guidelines.yml` ファイルでライセンスごとのガイドラインを定義します。

サンプル設定:
```yaml
version: "1.0"
guidelines:
  - license_id: "Apache-2.0"
    common_instructions: "Apache License 2.0の規定に従い、著作権表示と許諾表示を保持してください。"
    rules:
      - condition: "always"
        message: "NOTICEファイルが含まれている場合は製品に同梱してください。"
        input_type: "checkbox"
        label: "NOTICEファイルの対応"
```

詳細は `config/license-guidelines.yml` を参照してください。

## 使用方法

### 1. PR作成時の自動チェック

PRを作成すると、自動的に以下が実行されます:

1. 現在のブランチからSBOMを生成
2. Dependency-Trackから前回のSBOMを取得
3. 差分を比較
4. PRにコメントを投稿 (差分一覧とライセンスガイドライン)

**PRコメントの例:**
```markdown
## 🔍 OSS差分検出

前回リリースとの差分が検出されました。

### 差分一覧

| 変更 | OSS名 | バージョン | ライセンス |
|------|-------|-----------|-----------|
| 🆕 | lib-scanner | 2.1.0 | Apache-2.0 |
| 🔄 | fast-json | 1.4.0 → 1.5.0 | MIT |

### ライセンスガイドライン

**Apache-2.0 (lib-scanner)**
- NOTICEファイルが含まれている場合は製品に同梱してください。
```

### 2. タグ作成時の見直しIssue作成

リリースタグ (例: `v1.0.0`) を作成すると、自動的に見直しIssueが作成されます:

```bash
git tag v1.0.0
git push origin v1.0.0
```

見直しIssueには以下が含まれます:
- 差分コンポーネントの一覧
- 各ライセンスのガイドライン
- 入力フィールド (チェックボックス、テキスト、選択肢)
- 承認要求チェックボックス

### 3. 見直しIssueの対応

1. 作成された見直しIssueを開く
2. 各コンポーネントのガイドラインに従って対応
3. 入力フィールドに対応内容を記入
4. 承認が必要な場合は「承認を依頼する」チェックボックスをON
5. Issueをクローズ

Issueをクローズすると:
- 承認要求がONの場合: 承認Issueが自動作成される
- 承認要求がOFFの場合: 処理終了

### 4. 承認Issueの対応

1. 作成された承認Issueを開く
2. 見直し結果を確認
3. 承認する場合は「承認する」チェックボックスをON
4. Issueをクローズ

Issueをクローズすると:
- 承認がONの場合: SBOMがDependency-Trackに自動登録される
- 承認がOFFの場合: 処理終了

## ワークフロー詳細

### PR SBOM Check (`.github/workflows/pr-sbom-check.yml`)

**トリガー**: Pull Request作成・更新時

**処理フロー**:
1. Syftを使用してSBOMを生成
2. Dependency-Trackから前回のSBOMを取得
3. 差分を比較
4. ライセンスガイドラインを取得
5. PRにコメントを投稿
6. SBOMをアーティファクトとして保存

**必要な権限**:
- `contents: read`
- `pull-requests: write`

### Tag SBOM Review (`.github/workflows/tag-sbom-review.yml`)

**トリガー**: タグ作成時 (`v*`, `release-*`)

**処理フロー**:
1. Syftを使用してSBOMを生成
2. Dependency-Trackから前回のSBOMを取得
3. 差分を比較
4. ライセンスガイドラインを取得
5. 見直しIssueを作成
6. SBOMをアーティファクトとして保存

**必要な権限**:
- `contents: read`
- `issues: write`

### Review Close (`.github/workflows/review-close.yml`)

**トリガー**: 見直しIssueクローズ時 (ラベル: `oss-review`)

**処理フロー**:
1. Issueから見直し結果を抽出
2. 承認要求チェックボックスを確認
3. 承認要求がONの場合、承認Issueを作成
4. 見直し結果JSONをアーティファクトとして保存

**必要な権限**:
- `contents: read`
- `issues: write`

### Approval Close (`.github/workflows/approval-close.yml`)

**トリガー**: 承認Issueクローズ時 (ラベル: `oss-approval`)

**処理フロー**:
1. Issueから承認チェックボックスを確認
2. 承認がONの場合、SBOMをDependency-Trackに登録
3. コンポーネントプロパティを設定

**必要な権限**:
- `contents: read`

## スクリプト

### diff-checker.js

2つのSBOMを比較し、差分を検出します。

```bash
node dist/scripts/diff-checker.js <current-sbom> <previous-sbom> <output-file>
```

### license-guide-provider.js

ライセンスガイドラインを取得します。

```bash
node dist/scripts/license-guide-provider.js <license-id> <guidelines-file>
```

### pr-commenter.js

PRにコメントを投稿します。

```bash
node dist/scripts/pr-commenter.js <pr-number> <diff-file> <artifact-url> <guidelines-file>
```

### issue-creator.js

GitHub Issueを作成します。

```bash
# 見直しIssue作成
node dist/scripts/issue-creator.js review <version> <diff-file> <artifact-url> <guidelines-file>

# 承認Issue作成
node dist/scripts/issue-creator.js approval <version> <review-results-file> <sbom-url> <review-results-url>
```

### issue-parser.js

GitHub Issueから見直し結果を抽出します。

```bash
node dist/scripts/issue-parser.js <issue-number> <output-file>
```

### dt-client-cli.js

Dependency-Track APIと通信します。

```bash
# SBOM取得
node dist/scripts/dt-client-cli.js get-sbom <project-name> <version> <output-file>

# SBOM登録
node dist/scripts/dt-client-cli.js upload-sbom <project-name> <version> <sbom-file>

# コンポーネントプロパティ設定
node dist/scripts/dt-client-cli.js set-properties <project-uuid> <review-results-file>
```

## テスト

```bash
# すべてのテストを実行
npm test

# テストをウォッチモードで実行
npm run test:watch
```

## トラブルシューティング

### Dependency-Trackに接続できない

- `DT_BASE_URL` と `DT_API_KEY` が正しく設定されているか確認
- Dependency-TrackのAPIキーに適切な権限があるか確認
- ネットワーク接続を確認

### SBOMが生成されない

- Syftがインストールされているか確認
- プロジェクトに依存関係が存在するか確認
- ビルドツール (Maven, npm等) が正しく設定されているか確認

### PRコメントが投稿されない

- `GITHUB_TOKEN` に `pull-requests: write` 権限があるか確認
- ワークフローの実行ログを確認

### 見直しIssueが作成されない

- タグ名が `v*` または `release-*` のパターンに一致するか確認
- `GITHUB_TOKEN` に `issues: write` 権限があるか確認

## 他のプロジェクトからの利用

このOSS管理システムは、GitHub ActionsのReusable Workflows機能を使用して、同じOrganization内の他のプライベートリポジトリから再利用できます。

### クイックスタート

他のプロジェクトで `.github/workflows/pr-sbom-check.yml` を作成:

```yaml
name: PR SBOM Check

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  sbom-check:
    uses: your-org/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 詳細なドキュメント

詳しい使用方法は [Reusable Workflows 使用ガイド](docs/REUSABLE_WORKFLOWS.md) を参照してください。

### 利用可能なワークフロー

- **PR SBOM Check**: PRにSBOM差分をコメント
- **Tag SBOM Review**: タグ作成時に見直しIssueを作成
- **Review Close**: 見直しIssueクローズ時に承認Issueを作成
- **Approval Close**: 承認IssueクローズでDependency-Trackに登録

サンプルファイルは `docs/usage-examples/` ディレクトリにあります。

## ライセンス

MIT

## 貢献

Issue、Pull Requestを歓迎します。

## サポート

質問や問題がある場合は、GitHubのIssueを作成してください。
