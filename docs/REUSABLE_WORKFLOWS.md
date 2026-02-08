# Reusable Workflows 使用ガイド

このドキュメントでは、OSS管理システムのワークフローを他のプロジェクトから再利用する方法を説明します。

## 概要

このリポジトリは、GitHub Actionsの**Reusable Workflows**機能を使用して、OSS管理システムのワークフローを他のプライベートリポジトリから利用できるようにしています。

### メリット

- **中央管理**: ワークフローロジックを1箇所で管理
- **簡単な導入**: 他のプロジェクトでは数行の設定だけで利用可能
- **自動更新**: このリポジトリの変更が全プロジェクトに反映
- **プライベート共有**: Organization内のプライベートリポジトリ間で安全に共有

## 前提条件

### 1. Organization設定

Organization管理者が以下の設定を行う必要があります:

1. Organization Settings → Actions → General
2. "Workflow permissions" セクションで以下を確認:
   - "Allow GitHub Actions to create and approve pull requests" を有効化（PRコメント用）
3. "Fork pull request workflows from outside collaborators" セクション:
   - 適切な権限レベルを設定

### 2. リポジトリアクセス権限

呼び出し元のリポジトリが、このリポジトリ（log4j-vulnerable-sample）にアクセスできる必要があります:

- 同じOrganization内のプライベートリポジトリであれば、デフォルトで`GITHUB_TOKEN`を使用してアクセス可能
- 異なるOrganizationの場合は、Personal Access Token (PAT) が必要

## 利用可能なワークフロー

### 1. PR SBOM Check

PRが作成されたときにSBOMを生成し、差分をPRコメントとして投稿します。

**ワークフロー**: `.github/workflows/reusable-pr-sbom-check.yml`

**トリガー**: Pull Request作成・更新時

**必要な権限**:
- `contents: read`
- `pull-requests: write`

### 2. Tag SBOM Review

タグが作成されたときにSBOMを生成し、見直しIssueを作成します。

**ワークフロー**: `.github/workflows/reusable-tag-sbom-review.yml`

**トリガー**: タグ作成時

**必要な権限**:
- `contents: read`
- `issues: write`

### 3. Review Issue Close

見直しIssueがクローズされたときに、承認Issueを作成します。

**ワークフロー**: `.github/workflows/reusable-review-close.yml`

**トリガー**: Issue クローズ時（`oss-review`ラベル付き）

**必要な権限**:
- `contents: read`
- `issues: write`

### 4. Approval Issue Close

承認Issueがクローズされたときに、SBOMをDependency-Trackに登録します。

**ワークフロー**: `.github/workflows/reusable-approval-close.yml`

**トリガー**: Issue クローズ時（`oss-approval`ラベル付き）

**必要な権限**:
- `contents: read`

## セットアップ手順

### ステップ0: Syft除外設定（推奨）

SyftでSBOMを生成する際、不要なファイル（GitHub Actionsワークフローなど）を除外することを推奨します。

あなたのプロジェクトのルートディレクトリに `.syft.yaml` を作成:

```yaml
# .syft.yaml
exclude:
  - "./.github/**"           # GitHub Actions ワークフロー
  - "./.git/**"              # Git メタデータ
  - "**/node_modules/**"     # Node.js 依存関係（必要に応じて）
  - "**/test/**"             # テストファイル（必要に応じて）
  - "**/tests/**"            # テストファイル（必要に応じて）
```

この設定により、SBOMには実際のアプリケーション依存関係のみが含まれます。

**代替方法**: ワークフローファイルを直接編集する場合は、Syftコマンドに `--exclude` オプションを追加できます:

```yaml
- name: Generate SBOM with Syft
  run: |
    syft . -o cyclonedx-json=sbom-current.json --exclude './.github/**' --exclude './.git/**'
```

ただし、`.syft.yaml` を使用する方が管理しやすく推奨されます。

### ステップ1: サンプルファイルをコピー

`docs/usage-examples/` ディレクトリにあるサンプルファイルを、あなたのプロジェクトの `.github/workflows/` ディレクトリにコピーします:

```bash
# あなたのプロジェクトのルートディレクトリで実行
mkdir -p .github/workflows

# 必要なワークフローをコピー（例）
cp /path/to/log4j-vulnerable-sample/docs/usage-examples/caller-pr-sbom-check.yml .github/workflows/pr-sbom-check.yml
cp /path/to/log4j-vulnerable-sample/docs/usage-examples/caller-tag-sbom-review.yml .github/workflows/tag-sbom-review.yml
cp /path/to/log4j-vulnerable-sample/docs/usage-examples/caller-review-close.yml .github/workflows/review-close.yml
cp /path/to/log4j-vulnerable-sample/docs/usage-examples/caller-approval-close.yml .github/workflows/approval-close.yml
```

### ステップ2: Organization名を修正

コピーしたファイル内の `YOUR-ORG` を実際のOrganization名に置き換えます:

```yaml
# 修正前
uses: YOUR-ORG/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main

# 修正後（例: organizationが "my-company" の場合）
uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main
```

### ステップ3: Secretsを設定

あなたのプロジェクトのリポジトリ設定で、以下のSecretsを追加します:

1. Settings → Secrets and variables → Actions
2. 以下のSecretsを追加:

**必須**:
- `GITHUB_TOKEN`: 自動的に提供されるため設定不要

**Dependency-Track連携用（オプション）**:
- `DT_BASE_URL`: Dependency-TrackのベースURL
- `DT_API_KEY`: Dependency-TrackのAPIキー

### ステップ4: カスタマイズ（オプション）

#### カスタムライセンスガイドラインを使用する場合

1. あなたのプロジェクトに `config/license-guidelines.yml` を作成
2. ワークフローファイルで指定:

```yaml
jobs:
  sbom-check:
    uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main
    with:
      license-guidelines-path: 'config/my-custom-guidelines.yml'  # カスタムパスを指定
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

指定しない場合は、log4j-vulnerable-sampleリポジトリのデフォルトガイドラインが使用されます。

#### Node.jsバージョンを変更する場合

```yaml
jobs:
  sbom-check:
    uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main
    with:
      node-version: '18'  # Node.js 18を使用
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 使用例

### 最小構成（PR SBOM Check）

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
    uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### フル構成（全オプション指定）

```yaml
name: PR SBOM Check

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
      - develop

permissions:
  contents: read
  pull-requests: write

jobs:
  sbom-check:
    uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main
    with:
      license-guidelines-path: 'config/my-license-guidelines.yml'
      node-version: '20'
    secrets:
      DT_BASE_URL: ${{ secrets.DT_BASE_URL }}
      DT_API_KEY: ${{ secrets.DT_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## バージョン管理

ワークフローの参照には、ブランチ名、タグ、またはコミットSHAを指定できます:

```yaml
# mainブランチの最新版を使用（推奨）
uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@main

# 特定のタグを使用（安定版）
uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@v1.0.0

# 特定のコミットを使用（最も安全）
uses: my-company/log4j-vulnerable-sample/.github/workflows/reusable-pr-sbom-check.yml@abc123def456
```

**推奨**: 開発中は `@main` を使用し、本番環境では特定のタグやコミットSHAを使用してください。

## トラブルシューティング

### エラー: "Workflow does not have 'workflow_call' trigger"

**原因**: 指定したワークフローファイルが存在しないか、`workflow_call`トリガーが定義されていません。

**解決策**:
1. リポジトリ名とワークフローパスが正しいか確認
2. ブランチ名が正しいか確認（`@main` など）

### エラー: "Resource not accessible by integration"

**原因**: 必要な権限が不足しています。

**解決策**:
1. 呼び出し元のワークフローに適切な`permissions`を設定
2. Organization設定でワークフローの権限を確認

### エラー: "Repository not found"

**原因**: 呼び出し元のリポジトリが、log4j-vulnerable-sampleリポジトリにアクセスできません。

**解決策**:
1. 両方のリポジトリが同じOrganization内にあることを確認
2. リポジトリ名が正しいか確認
3. 必要に応じてPATを使用

### ワークフローが実行されない

**原因**: トリガー条件が満たされていない可能性があります。

**解決策**:
1. ワークフローファイルの`on`セクションを確認
2. ブランチ名やタグパターンが一致しているか確認
3. Issueの場合、正しいラベル（`oss-review`、`oss-approval`）が付いているか確認

## 更新とメンテナンス

### ワークフローの更新

log4j-vulnerable-sampleリポジトリのワークフローを更新すると、`@main`を参照している全プロジェクトに自動的に反映されます。

### 変更の通知

重要な変更がある場合は、以下の方法で通知することを推奨します:

1. CHANGELOG.mdを更新
2. GitHubのReleasesでバージョンタグを作成
3. Organization内で通知

## サポート

問題が発生した場合は、log4j-vulnerable-sampleリポジトリにIssueを作成してください。

## 参考リンク

- [GitHub Actions: Reusing workflows](https://docs.github.com/en/actions/using-workflows/reusing-workflows)
- [GitHub Actions: Workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions: Security hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
