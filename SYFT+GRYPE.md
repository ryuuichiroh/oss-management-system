# SYFT + GRYPE

## [Syft](https://github.com/anchore/syft) の機能概要

厳密な SBOM の生成ツール。

### 1. 多種類のパッケージ検出（カタログ機能）
Syft はさまざまなパッケージの検出に対応している。
* コンテナの OS パッケージ
* アプリの依存ライブラリ
* FS 直下に存在する JAR / wheel / gem / npm module ファイル

### 2. ファイルメタデータ収集（ハッシュ計算など）
SBOM の一部として Syft は、以下のファイルメタ情報も収集する。
* ファイルの SHA1/SHA256
* ファイルのパス
* タイムスタンプ

### 3. cosine（sigstore）連携による SBOM Attestation（署名）

SBOM を sigstore/cosign で署名した “attestation” として発行できる。
これによって SBOM 偽装を防止でき、supply chain の Integrity を守ることができる。

## [Grype](https://github.com/anchore/grype) の機能概要

以下をスキャンして、脆弱性を検出できる。
* SBOM（CycloneDX/SPDX/Syft JSON）
* コンテナイメージ
* ローカルファイルやディレクトリ

Grype は「脆弱性を検出する」だけじゃなく、「脆弱性の優先度づけ（Prioritization 機能）」 も持っている。

そのために、以下を出力できる。
* EPSS（Exploit Prediction Scoring System）

  アメリカの FIRST が公開する「今後 exploit される確率」を示すスコア。

  意味：
  CVSS だけでは「危険度」は分かるけど、“実際に攻撃されそうか” は分からない。
  EPSS は「攻撃される可能性」を数字で示す指標。

* KEV（Known Exploited Vulnerabilities）

  アメリカの CISA が公開している「実際に exploit されていることが確認された CVE のリスト」。

  意味：
  EPSS が「近い将来の攻撃可能性」なら、KEV は “すでに攻撃されている脆弱性”。

* Risk スコア（Risk / RiskPriority）
  
  Grype は EPSS + KEV + CVSS を統合して、総合的なリスクスコアを算出できる。

## アプリケーションの SBOM 生成方法と脆弱性の検査

### キャッシュの保存場所の用意
```
# Syft 用（SBOM生成のキャッシュ）
export SYFT_CACHE=$HOME/.cache/syft
# Grype 用（脆弱性DBのキャッシュ）
export GRYPE_CACHE=$HOME/.cache/grype
mkdir -p "$SYFT_CACHE" "$GRYPE_CACHE"
```

### Syft: SBOM 生成
```
docker run --rm \
  -v "$PWD":/repo \
  -v "$SYFT_CACHE":/home/anchore/.cache/syft \
  anchore/syft:latest \
  dir:/repo \
  --source-name kiro-rsi-app \
  --source-version 0.1.0 \
  --exclude '**/node_modules/**' \
  -o cyclonedx-json=/repo/syft-sbom.cdx.json
```

### Grype: 脆弱性検査
```
docker run --rm \
  -v "$PWD":/work \
  -v "$GRYPE_CACHE":/home/anchore/.cache/grype \
  anchore/grype:latest \
  sbom:/work/syft-sbom.cdx.json -o table
```

以下のような出力が得られる。
```
NAME                              INSTALLED  FIXED IN  TYPE       VULNERABILITY        SEVERITY  EPSS           RISK   
qs                                6.14.0     6.14.1    npm        GHSA-6rw7-vpxm-498p  High      0.2% (36th)    0.1    
react-router                      7.11.0     7.12.0    npm        GHSA-8v8x-cx79-35w7  High      < 0.1% (13th)  < 0.1  
react-router                      7.11.0     7.12.0    npm        GHSA-2w69-qvjg-hvjx  High      < 0.1% (13th)  < 0.1  
github.com/open-policy-agent/opa  v0.69.0    1.4.0     go-module  GHSA-6m8w-jc87-6cr7  High      < 0.1% (8th)   < 0.1  
react-router                      7.11.0     7.12.0    npm        GHSA-h5cw-625j-3rxh  Medium    < 0.1% (2nd)   < 0.1
```

## コンテナイメージの SBOM 生成と脆弱性検査

### Syft: SBOM 生成
```
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD":/work \
  -v "$SYFT_CACHE":/home/anchore/.cache/syft \
  anchore/syft:latest \
  rsi-app-backend:latest \
  -o cyclonedx-json=/work/syft-sbom-backend-image.cdx.json
```

### Grype: 脆弱性検査

```
docker run --rm \
  -v "$PWD":/work \
  -v "$GRYPE_CACHE":/home/anchore/.cache/grype \
  anchore/grype:latest \
  sbom:/work/syft-sbom-backend-image.cdx.json -o table
```

以下のような結果が得られる。
```
NAME  INSTALLED  FIXED IN  TYPE  VULNERABILITY        SEVERITY  EPSS          RISK   
qs    6.14.0     6.14.1    npm   GHSA-6rw7-vpxm-498p  High      0.2% (36th)   0.1    
tar   7.5.2      7.5.3     npm   GHSA-8qq5-rm4j-mr97  High      < 0.1% (2nd)  < 0.1  
diff  8.0.2      8.0.3     npm   GHSA-73rr-hh4g-fpgx  Low       N/A           N/A
```

Image をそのまま Scan する場合は、以下を実行する。
```
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$GRYPE_CACHE":/home/anchore/.cache/grype \
  anchore/grype:latest \
  rsi-app-backend:latest -o table
```
