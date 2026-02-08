# 要件定義書

## はじめに

OSS管理システムは、ソフトウェア製品開発で利用するOSS(オープンソースソフトウェア)の管理を自動化するシステムです。現在、エクセルファイルで管理されているOSS利用管理シートの更新漏れやミスを防ぎ、未承認のままの製品リリースを防止します。SBOM(Software Bill of Materials)の自動生成、差分の自動チェック、見直しと承認の状態可視化により、開発スピードを維持しながら適切なOSS管理を実現します。

## 用語集

- **System**: OSS管理システム全体
- **SBOM_Generator**: SBOMを生成するコンポーネント(Syft)
- **Diff_Checker**: SBOM間の差分を比較するコンポーネント
- **License_Guide_Provider**: ライセンスごとのガイド情報を提供するコンポーネント
- **Task_Manager**: 見直しタスクと承認タスクを管理するコンポーネント
- **DT_Client**: Dependency-TrackのWeb APIクライアント
- **GitHub_Actions**: GitHub Actionsワークフロー
- **Issue_Creator**: GitHub Issueを作成するコンポーネント
- **PR**: プルリクエスト
- **SBOM**: Software Bill of Materials (ソフトウェア部品表)
- **DT**: Dependency-Track (SBOM中央管理システム)
- **Component**: DT内で管理されるOSSの単位
- **Reviewer**: 見直し担当者
- **Approver**: 承認管理者

## 要件

### 要件1: SBOM自動生成

**ユーザーストーリー:** 開発者として、PRを作成したときにSBOMが自動生成されることで、管理シートの手動更新なしにOSSの変更を把握したい。

#### 受入基準

1. WHEN PRが作成されたとき、THE GitHub_Actions SHALL PRブランチからSBOMを生成する
2. WHEN タグが作成されたとき、THE GitHub_Actions SHALL メインブランチからSBOMを生成する
3. THE SBOM_Generator SHALL Syftを使用してCycloneDX形式のSBOMを作成する
4. WHEN SBOM生成が完了したとき、THE System SHALL SBOMをGitHub Actionsアーティファクトとして利用可能にする
5. THE SBOM SHALL group、name、versionフィールドを含むコンポーネント情報を含む

### 要件2: SBOM差分比較

**ユーザーストーリー:** 開発者として、前回リリースとの差分のみを確認することで、変更されたOSSコンポーネントのみのレビューに集中したい。

#### 受入基準

1. WHEN SBOMが生成されたとき、THE Diff_Checker SHALL DTから比較対象のSBOMを取得する
2. THE Diff_Checker SHALL group、name、versionフィールドに基づいてコンポーネントを比較する
3. WHEN コンポーネントが異なるとき、THE Diff_Checker SHALL それらを追加、更新、削除として識別する
4. THE Diff_Checker SHALL 差分のあるコンポーネントのリストを出力する
5. WHEN DTに比較対象が存在しないとき、THE Diff_Checker SHALL すべてのコンポーネントを新規追加として扱う

### 要件3: ライセンスガイド提供

**ユーザーストーリー:** 法務知識が限られた開発者として、変更されたOSSのライセンス固有のガイドラインを確認することで、必要なアクションを理解したい。

#### 受入基準

1. THE License_Guide_Provider SHALL YAML設定ファイルからライセンスガイドラインを読み込む
2. WHEN コンポーネントの差分が検出されたとき、THE License_Guide_Provider SHALL そのコンポーネントのライセンスに対するガイドラインを取得する
3. THE License_Guide_Provider SHALL 改変状態、リンクタイプ、配布方法に基づく条件付きルールをサポートする
4. THE License_Guide_Provider SHALL 各ガイドラインに対する入力フィールド仕様(checkbox、text、select)を提供する
5. WHEN ライセンスに定義されたガイドラインがないとき、THE License_Guide_Provider SHALL デフォルトメッセージを返す

### 要件4: PR自動コメント

**ユーザーストーリー:** 開発者として、OSSの差分とライセンスガイドラインがPRコメントとして表示されることで、コードレビュー中に確認したい。

#### 受入基準

1. WHEN PRがSBOM生成をトリガーしたとき、THE System SHALL 差分情報を含むコメントをPRに投稿する
2. THE PRコメント SHALL 差分のあるコンポーネントのリストを含む
3. THE PRコメント SHALL 各変更コンポーネントに対するライセンス固有のガイドラインを含む
4. THE PRコメント SHALL 生成されたSBOMアーティファクトをダウンロードするリンクを含む
5. THE PRコメント SHALL 一貫性のために固定フォーマットを使用する

### 要件5: 見直しタスク作成

**ユーザーストーリー:** プロジェクトマネージャーとして、リリースタグが作成されたときに見直しタスクが自動的にアサインされることで、OSSコンプライアンスレビューが忘れられないようにしたい。

#### 受入基準

1. WHEN タグが作成されたとき、THE Task_Manager SHALL 見直し用のGitHub Issueを作成する
2. THE Issue_Creator SHALL 入力フォーマットを強制するためにGitHub Issue Forms (YAML)を使用する
3. THE 見直しIssue SHALL ライセンス情報を含むコンポーネント差分のテーブルを含む
4. THE 見直しIssue SHALL ライセンスガイドラインに基づく各コンポーネントの入力フィールドを含む
5. THE 見直しIssue SHALL 承認を要求するチェックボックスを含む
6. THE 見直しIssue SHALL SBOMアーティファクトへのリンクを含む
7. THE 見直しIssue SHALL 指定されたReviewerにアサインされる

### 要件6: 承認タスク作成

**ユーザーストーリー:** 見直し担当者として、見直し完了後に承認を要求することで、管理者が私のコンプライアンス対応を検証できるようにしたい。

#### 受入基準

1. WHEN 見直しIssueがクローズされたとき、THE GitHub_Actions SHALL 承認要求チェックボックスの状態を確認する
2. WHEN 承認要求チェックボックスがONのとき、THE Task_Manager SHALL 承認用の新しいGitHub Issueを作成する
3. THE 承認Issue SHALL クローズされた見直しIssueからの見直し結果を含む
4. THE 承認Issue SHALL SBOMと見直し結果JSONへのリンクを含む
5. THE 承認Issue SHALL 指定されたApproverにアサインされる
6. WHEN 承認要求チェックボックスがOFFのとき、THE GitHub_Actions SHALL 承認Issueを作成せずに終了する

### 要件7: SBOM正式登録

**ユーザーストーリー:** 承認者として、承認後にSBOMが自動的にDependency-Trackに登録されることで、それが正式な記録となるようにしたい。

#### 受入基準

1. WHEN 承認Issueがクローズされたとき、THE GitHub_Actions SHALL 承認チェックボックスの状態を確認する
2. WHEN 承認チェックボックスがONのとき、THE DT_Client SHALL SBOMを使用してDTにプロジェクトを登録する
3. THE DT_Client SHALL 見直し結果を使用して登録されたDTプロジェクトにコンポーネントプロパティを追加する
4. THE DT_Client SHALL SBOMのgroup、name、version情報を使用してコンポーネントを識別する
5. WHEN 承認チェックボックスがOFFのとき、THE GitHub_Actions SHALL DTへの登録を行わずに終了する

### 要件8: 対応結果の記録

**ユーザーストーリー:** コンプライアンス担当者として、見直し結果が構造化データとして保存されることで、後でコンプライアンス対応を監査できるようにしたい。

#### 受入基準

1. WHEN 見直しIssueがクローズされたとき、THE System SHALL Issueから見直し結果を抽出する
2. THE System SHALL 見直し結果をJSON形式に変換する
3. THE System SHALL JSONファイルをGitHub Actionsアーティファクトとして利用可能にする
4. THE JSON SHALL コンポーネント識別子(group、name、version)と対応する見直しアクションを含む
5. WHEN DTに登録するとき、THE System SHALL JSONを使用してコンポーネントプロパティを設定する

### 要件9: エラーハンドリング

**ユーザーストーリー:** システム管理者として、システムがエラーを適切に処理することで、障害が可視化されデバッグ可能になるようにしたい。

#### 受入基準

1. WHEN SBOM生成が失敗したとき、THE GitHub_Actions SHALL エラーをログに記録しワークフローを失敗させる
2. WHEN DT APIコールが失敗したとき、THE DT_Client SHALL レスポンス詳細を含むエラーをログに記録しワークフローを失敗させる
3. WHEN ライセンスガイドラインファイルが存在しないか無効なとき、THE License_Guide_Provider SHALL 警告をログに記録しデフォルトガイドラインで続行する
4. WHEN Issue作成が失敗したとき、THE Issue_Creator SHALL エラーをログに記録しワークフローを失敗させる
5. IF 比較対象のSBOMがDTに見つからないとき、THEN THE System SHALL 警告をログに記録しすべてのコンポーネントを新規として扱う

### 要件10: 拡張性の確保

**ユーザーストーリー:** システムアーキテクトとして、システムが大規模な作り直しなしに拡張可能であることで、ニーズの進化に応じて機能を追加できるようにしたい。

#### 受入基準

1. THE System SHALL 組み合わせ可能なモジュール式のGitHub Actionsワークフローを使用する
2. THE System SHALL ハードコーディングではなく外部ファイル(YAML)から設定を読み込む
3. THE System SHALL データ交換に標準フォーマット(CycloneDX、JSON)を使用する
4. THE System SHALL 外部ツール向けに中間アーティファクト(SBOM、差分結果、見直しJSON)を公開する
5. WHERE カスタムロジックが必要なとき、THE System SHALL bashに加えてTypeScript/JavaScriptスクリプトをサポートする
