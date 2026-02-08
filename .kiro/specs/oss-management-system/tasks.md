# 実装計画: OSS管理システム

## 概要

OSS管理システムは、GitHub ActionsとDependency-Trackを活用したワークフロー自動化システムです。実装は以下のアプローチで進めます:

- **主要な制御フロー**: bashスクリプトとGitHub Actionsワークフロー
- **複雑なロジック**: TypeScript/JavaScript (差分比較、ガイドライン評価、Issue生成)
- **外部ツール**: Syft (SBOM生成)、Dependency-Track API (SBOM管理)

実装は、各ワークフローを独立して構築し、最後に統合する方式で進めます。

## タスク

- [x] 1. プロジェクト構造とコア型定義のセットアップ
  - `.github/workflows/` ディレクトリを作成
  - `scripts/` ディレクトリを作成 (TypeScript/JavaScriptスクリプト用)
  - `config/` ディレクトリを作成 (license-guidelines.yml用)
  - TypeScript型定義ファイル `scripts/types.ts` を作成
    - SBOM、Component、License、ComponentDiff、Guideline等の型を定義
  - `package.json` を作成し、必要な依存関係を追加
    - `@actions/core`, `@actions/github`, `js-yaml`, `ajv` (JSONスキーマ検証用)
  - TypeScriptコンパイル設定 `tsconfig.json` を作成
  - _要件: 10.1, 10.2, 10.3_

- [ ] 2. SBOM差分比較機能の実装
  - [x] 2.1 Diff Checkerスクリプトの実装
    - `scripts/diff-checker.ts` を作成
    - 2つのSBOMを読み込み、コンポーネントを比較するロジックを実装
    - 差分タイプ(added、updated、removed)を識別
    - 差分結果をJSON形式で出力
    - _要件: 2.2, 2.3, 2.4_
  
  - [ ]* 2.2 Diff Checkerのプロパティテストを実装
    - **Property 2: SBOM差分検出の正確性**
    - **Validates: 要件 2.2, 2.3, 2.4**
    - fast-checkを使用してランダムなSBOMペアを生成
    - 差分検出ロジックの正確性を検証
    - 最低100回の反復を設定
  
  - [ ]* 2.3 Diff Checkerのユニットテストを実装
    - 空のSBOMに対する差分検出
    - groupフィールドが欠落したコンポーネントの処理
    - 同一SBOMの比較(差分なし)
    - _要件: 2.2, 2.3, 2.4_

- [ ] 3. ライセンスガイドライン機能の実装
  - [x] 3.1 License Guide Providerスクリプトの実装
    - `scripts/license-guide-provider.ts` を作成
    - YAML設定ファイル読み込み機能を実装
    - ライセンスIDに基づくガイドライン取得機能を実装
    - 条件評価エンジンを実装(always、is_modified、link_type、is_distributed)
    - デフォルトガイドラインのフォールバック処理を実装
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 3.2 サンプルlicense-guidelines.ymlの作成
    - `config/license-guidelines.yml` を作成
    - Apache-2.0、MIT、GPL-3.0、デュアルライセンスのガイドラインを定義
    - _要件: 3.1_
  
  - [ ]* 3.3 License Guide Providerのプロパティテストを実装
    - **Property 3: YAMLガイドライン設定のラウンドトリップ**
    - **Property 4: ライセンスガイドライン取得の完全性**
    - **Validates: 要件 3.1, 3.2, 3.3, 3.4**
    - ランダムなライセンスIDとコンテキストを生成
    - ガイドライン取得の正確性を検証
    - 最低100回の反復を設定
  
  - [ ]* 3.4 License Guide Providerのユニットテストを実装
    - 無効なYAML設定の処理
    - 未定義ライセンスのデフォルトガイドライン
    - 条件評価の正確性(各条件タイプ)
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. チェックポイント - コアロジックの動作確認
  - すべてのテストが通ることを確認
  - 質問があればユーザーに確認

- [ ] 5. PR自動コメント機能の実装
  - [x] 5.1 PR Commenterスクリプトの実装
    - `scripts/pr-commenter.ts` を作成
    - 差分リストとガイドラインからMarkdownコメントを生成
    - GitHub APIを使用してPRにコメントを投稿
    - コメントフォーマット: テーブル、ガイドライン、アーティファクトリンク
    - _要件: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 5.2 PR Commenterのプロパティテストを実装
    - **Property 5: PRコメント生成の完全性**
    - **Validates: 要件 4.2, 4.3, 4.4, 4.5**
    - ランダムな差分リストとガイドラインを生成
    - コメント内容の完全性とMarkdown形式の妥当性を検証
    - 最低100回の反復を設定
  
  - [ ]* 5.3 PR Commenterのユニットテストを実装
    - 空の差分リストの処理
    - 特殊文字を含むコンポーネント名の処理
    - Markdownエスケープの正確性
    - _要件: 4.2, 4.3, 4.4, 4.5_

- [ ] 6. Issue生成機能の実装
  - [x] 6.1 Issue Creatorスクリプトの実装
    - `scripts/issue-creator.ts` を作成
    - 見直しIssue Form (YAML)生成機能を実装
    - 承認Issue (Markdown)生成機能を実装
    - GitHub APIを使用してIssueを作成
    - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3, 6.4_
  
  - [ ]* 6.2 Issue Creatorのプロパティテストを実装
    - **Property 6: 見直しIssue生成の完全性**
    - **Property 7: 承認Issue生成の完全性**
    - **Validates: 要件 5.2, 5.3, 5.4, 5.5, 5.6, 6.3, 6.4**
    - ランダムな差分リストと見直し結果を生成
    - Issue内容の完全性とYAML/Markdown形式の妥当性を検証
    - 最低100回の反復を設定
  
  - [ ]* 6.3 Issue Creatorのユニットテストを実装
    - 空の差分リストの処理
    - 複雑なガイドライン(select、複数条件)の処理
    - YAML形式の妥当性検証
    - _要件: 5.2, 5.3, 5.4, 5.5, 5.6, 6.3, 6.4_

- [ ] 7. 見直し結果パース機能の実装
  - [x] 7.1 Issue Parserスクリプトの実装
    - `scripts/issue-parser.ts` を作成
    - GitHub Issue本文から見直し結果を抽出
    - チェックボックス状態の抽出
    - 入力フィールド値の抽出
    - JSON形式で出力
    - _要件: 8.1, 8.2, 8.4_
  
  - [ ]* 7.2 Issue Parserのプロパティテストを実装
    - **Property 9: Issue本文パースの正確性**
    - **Property 10: 見直し結果のシリアライゼーション**
    - **Validates: 要件 8.1, 8.2, 8.4**
    - ランダムなIssue本文を生成
    - パース結果の正確性とラウンドトリップを検証
    - 最低100回の反復を設定
  
  - [ ]* 7.3 Issue Parserのユニットテストを実装
    - 不正なフォーマットの処理
    - 欠落フィールドの処理
    - 特殊文字を含む値の処理
    - _要件: 8.1, 8.2, 8.4_

- [ ] 8. Dependency-Track連携機能の実装
  - [x] 8.1 DT Clientスクリプトの実装
    - `scripts/dt-client.ts` を作成
    - SBOM取得機能を実装 (GET /api/v1/bom/cyclonedx/project/{uuid})
    - SBOM登録機能を実装 (PUT /api/v1/bom)
    - コンポーネント一覧取得機能を実装 (GET /api/v1/component/project/{uuid})
    - コンポーネントプロパティ設定機能を実装 (PUT /api/v1/component/{uuid}/property)
    - エラーハンドリングとリトライロジックを実装
    - _要件: 2.1, 7.2, 7.3, 7.4_
  
  - [ ]* 8.2 DT Clientのプロパティテストを実装
    - **Property 8: コンポーネント識別の一貫性**
    - **Validates: 要件 7.4**
    - ランダムなSBOMとDTコンポーネントリストを生成
    - コンポーネントマッチングロジックの正確性を検証
    - 最低100回の反復を設定
  
  - [ ]* 8.3 DT Clientのユニットテストを実装
    - API接続エラーの処理
    - リトライロジックの動作確認
    - 不正なレスポンスの処理
    - _要件: 7.2, 7.3, 7.4, 9.2_

- [x] 9. チェックポイント - すべてのスクリプトの動作確認
  - すべてのテストが通ることを確認
  - 質問があればユーザーに確認

- [ ] 10. PR作成時ワークフローの実装
  - [x] 10.1 PR Workflowの作成
    - `.github/workflows/pr-sbom-check.yml` を作成
    - PRトリガーを設定
    - Syftを使用してSBOMを生成するステップを追加
    - DT Clientを使用して比較対象SBOMを取得するステップを追加
    - Diff Checkerを使用して差分を検出するステップを追加
    - License Guide Providerを使用してガイドラインを取得するステップを追加
    - PR Commenterを使用してコメントを投稿するステップを追加
    - SBOMをアーティファクトとしてアップロードするステップを追加
    - _要件: 1.1, 1.3, 1.4, 2.1, 3.2, 4.1_
  
  - [ ]* 10.2 PR Workflowのユニットテストを実装
    - ワークフロー構文の妥当性検証
    - 環境変数の設定確認
    - _要件: 1.1, 1.3, 1.4_

- [ ] 11. タグ作成時ワークフローの実装
  - [x] 11.1 Tag Workflowの作成
    - `.github/workflows/tag-sbom-review.yml` を作成
    - タグ作成トリガーを設定
    - Syftを使用してSBOMを生成するステップを追加
    - DT Clientを使用して比較対象SBOMを取得するステップを追加
    - Diff Checkerを使用して差分を検出するステップを追加
    - License Guide Providerを使用してガイドラインを取得するステップを追加
    - Issue Creatorを使用して見直しIssueを作成するステップを追加
    - SBOMをアーティファクトとしてアップロードするステップを追加
    - _要件: 1.2, 1.3, 1.4, 2.1, 3.2, 5.1, 5.2_
  
  - [ ]* 11.2 Tag Workflowのユニットテストを実装
    - ワークフロー構文の妥当性検証
    - 環境変数の設定確認
    - _要件: 1.2, 1.3, 1.4_

- [ ] 12. 見直しIssueクローズ時ワークフローの実装
  - [x] 12.1 Review Close Workflowの作成
    - `.github/workflows/review-close.yml` を作成
    - Issueクローズトリガーを設定(ラベルで見直しIssueを識別)
    - Issue Parserを使用して見直し結果を抽出するステップを追加
    - 承認要求チェックボックスの状態を確認するステップを追加
    - 承認要求がONの場合、Issue Creatorを使用して承認Issueを作成するステップを追加
    - 見直し結果JSONをアーティファクトとしてアップロードするステップを追加
    - _要件: 6.1, 6.2, 8.1, 8.2, 8.3_
  
  - [ ]* 12.2 Review Close Workflowのユニットテストを実装
    - ワークフロー構文の妥当性検証
    - 条件分岐の動作確認
    - _要件: 6.1, 6.2_

- [ ] 13. 承認Issueクローズ時ワークフローの実装
  - [x] 13.1 Approval Close Workflowの作成
    - `.github/workflows/approval-close.yml` を作成
    - Issueクローズトリガーを設定(ラベルで承認Issueを識別)
    - Issue Parserを使用して承認チェックボックスの状態を確認するステップを追加
    - 承認がONの場合、DT Clientを使用してSBOMを登録するステップを追加
    - DT Clientを使用してコンポーネントプロパティを設定するステップを追加
    - _要件: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 13.2 Approval Close Workflowのユニットテストを実装
    - ワークフロー構文の妥当性検証
    - 条件分岐の動作確認
    - _要件: 7.1, 7.2_

- [x] 14. チェックポイント - すべてのワークフローの動作確認
  - すべてのテストが通ることを確認
  - 質問があればユーザーに確認

- [x] 15. ドキュメントとサンプルの作成
  - [x] 15.1 README.mdの作成
    - システム概要を記載
    - セットアップ手順を記載
    - 各ワークフローの使用方法を記載
    - 環境変数の設定方法を記載(DT_API_KEY等)
    - _要件: 10.1_
  
  - [x] 15.2 サンプルlicense-guidelines.ymlの拡充
    - より多くのライセンスタイプを追加
    - 実際のユースケースに基づくガイドラインを追加
    - _要件: 3.1_
  
  - [x] 15.3 GitHub Issue Form テンプレートの作成
    - `.github/ISSUE_TEMPLATE/oss-review.yml` を作成(見直しIssue用)
    - `.github/ISSUE_TEMPLATE/oss-approval.yml` を作成(承認Issue用)
    - _要件: 5.2_

- [x] 16. 最終チェックポイント
  - すべてのテストが通ることを確認
  - すべてのワークフローが正しく動作することを確認
  - ドキュメントが完全であることを確認
  - 質問があればユーザーに確認

## 注意事項

- `*` マークのタスクはオプションであり、より迅速なMVPのためにスキップ可能です
- 各タスクは特定の要件を参照しており、トレーサビリティを確保しています
- チェックポイントは段階的な検証を保証します
- プロパティテストは普遍的な正確性プロパティを検証します
- ユニットテストは特定の例とエッジケースを検証します
