# Phase 6 残タスク 実施プラン（初学者向け詳細手順）

## Context

PROGRESS.md の未チェック項目はすべて **Phase 6（収益化・ストア申請）** に集中しており、
コード実装はほぼ完了している。残るのは **外部サービス上での設定** と **ビルド・申請プロセス** のみ。

| 状態 | 内容 |
|---|---|
| 実装済み | AdMob 統合（[frontend/lib/adsafe.ts](frontend/lib/adsafe.ts)）／ RevenueCat 統合（[frontend/lib/purchasessafe.ts](frontend/lib/purchasessafe.ts)）／ AdContext（[frontend/context/AdContext.tsx](frontend/context/AdContext.tsx)）／ 設定画面の購入・復元 UI（[frontend/app/settings.tsx](frontend/app/settings.tsx)）／ EAS Build 設定（[frontend/eas.json](frontend/eas.json)）／ Bundle ID `com.tatsunobu.ropejump`（[frontend/app.json:18](frontend/app.json#L18)） |
| 未設定 | AdMob 本番 App ID／本番ユニット ID（[frontend/app.json:42-43](frontend/app.json#L42-L43) はテスト ID／[frontend/.env:5,9-10](frontend/.env#L5) はプレースホルダ） |
| 未着手 | Apple Developer Program 登録／App Store Connect 設定／IAP 商品／RevenueCat 連携／EAS 本番ビルド／TestFlight／ピクセルアート差し替え／プライバシーポリシー／審査申請 |

ユーザーは初めての App Store 申請のため、**Apple 承認待ちを並列活用** する方針。
**ピクセルアート差し替えは本プランの対象外**（現在のコード描画グラフィックのまま v1.0 を申請する）。

---

## 全体フロー（並列活用版）

```
Day 0 ─┬─ Track A: Apple Developer 登録（承認まで 24-48h、個人認証で長引く可能性）
       ├─ Track B: AdMob アカウント＆アプリ＆広告ユニット作成
       ├─ Track C: RevenueCat プロジェクト＆iOS API キー取得
       └─ Track D: プライバシーポリシー作成

Day 2 ── Track A 承認 → App ID 登録 → ASC アプリ作成 → IAP 商品作成 → 有料App契約
                    └─ RevenueCat ↔ ASC 連携（ASC API キー作成）

Day 3 ── アプリ側統合（.env / app.json 更新／SKAdNetwork 追加）
       └─ EAS Build → TestFlight → 実機テスト

Day 4-6 ── ストア素材（スクリーンショット／説明文／プラポリ URL）→ 審査申請
```

---

## Track A: Apple Developer Program 登録（$99/年）

### Step A-1: 事前準備
- **Apple ID**: 個人用 Apple ID で OK。二段階認証を有効化必須。
- **必要情報**: 本名（パスポート表記）／住所（英語表記でも可）／クレジットカード／電話番号。
- **個人 vs 法人**: 個人を選択（個人事業主含む）。法人は D-U-N-S 番号取得（無料・1-2 週間）が必要。

### Step A-2: 登録手順
1. https://developer.apple.com/programs/enroll/ にアクセス
2. Apple ID でサインイン
3. 「Start Your Enrollment」→ 個人（Individual）を選択
4. 個人情報入力（**英語表記**: 例 `Tatsunobu Eto`）
5. 利用規約に同意
6. 支払い ($99 USD = 約 ¥15,000、年額自動更新／解約は別途手動）
7. **承認待ち**: メールで Apple サポートから本人確認連絡が来る場合あり。電話／パスポート画像で対応。
8. 承認後、`developer.apple.com` のダッシュボードに「Apple Developer Program」のメンバーシップが表示される。

### Step A-3: App ID 登録（承認後）
1. https://developer.apple.com/account/resources/identifiers/list にアクセス
2. 「Identifiers」→「+」
3. 「App IDs」→ Continue → 「App」→ Continue
4. Description: `Rope Jump Survival`
5. Bundle ID（Explicit）: `com.tatsunobu.ropejump` ← [frontend/app.json:18](frontend/app.json#L18) と完全一致
6. Capabilities: **「In-App Purchase」をチェック**
7. Continue → Register

---

## Track B: AdMob 設定（並列実行可）

### Step B-1: アカウント作成
1. https://admob.google.com に Google アカウントでサインアップ
2. 国: 日本／タイムゾーン: GMT+09:00 ／支払い通貨: JPY
3. 利用規約同意

### Step B-2: アプリ登録
1. 「アプリ」→「アプリを追加」
2. プラットフォーム: iOS
3. 「アプリは App Store に登録されていますか？」→ **いいえ**（後で App Store 連携）
4. アプリ名: `大縄跳びサバイバル`
5. **AdMob App ID をコピー**（形式: `ca-app-pub-XXXXXXXXXXXX~YYYYYYYY`、`~`に注目）

### Step B-3: 広告ユニット作成（バナー）
1. 該当アプリ→「広告ユニット」→「広告ユニットを追加」
2. 形式: **バナー**
3. 広告ユニット名: `iOS Banner Title`
4. **広告ユニット ID をコピー**（形式: `ca-app-pub-XXXXXXXXXXXX/YYYYYYYY`、`/`に注目）

### Step B-4: 広告ユニット作成（インタースティシャル）
- 同上の手順で形式を **インタースティシャル** に変更し作成

### Step B-5: 支払い情報
- 「お支払い」→ 住所・税情報入力（後回し可だが、収益が ¥8,000 を超える前に必須）

---

## Track C: RevenueCat 設定（並列実行可）

### Step C-1: プロジェクト作成
1. https://app.revenuecat.com でサインアップ（GitHub 連携可）
2. 「Create new project」→ プロジェクト名: `Rope Jump`
3. 「+ New app」→ プラットフォーム: **App Store**
4. App Bundle ID: `com.tatsunobu.ropejump`

### Step C-2: API キー取得
1. プロジェクト→「API keys」
2. **iOS Public API key（`appl_xxxxxxxxxxxxxxxx`）をコピー** ← [frontend/.env:5](frontend/.env#L5) に貼る

### Step C-3: ASC API キー登録（Track A 承認後）
※ App Store Connect の有料 App 契約完了が前提
1. ASC →「ユーザーとアクセス」→「統合」→「App Store Connect API」→ **「In-App Purchase」キー**
2. 「+」→ Name: `RevenueCat` → 「キーを作成」
3. **`.p8` ファイルダウンロード（一度のみ）／Issuer ID／Key ID をメモ**
4. RevenueCat ダッシュボード→ App→「App Store Connect API」
5. Issuer ID／Key ID／.p8 をアップロード

### Step C-4: Offering 設定（IAP 商品登録後）
1. RevenueCat →「Products」→「+ New」→ 製品 ID `remove_ads` を登録
2. 「Entitlements」→「+ New」→ ID: `remove_ads` → product をアタッチ
3. 「Offerings」→ default offering に `remove_ads` パッケージを追加

---

## Track D: プラポリ作成（並列実行可）

> ピクセルアート差し替えは本プラン対象外。現在のコード描画グラフィックのまま v1.0 を申請する。
> ただし、アプリアイコン（[frontend/assets/icon.png](frontend/assets/icon.png), 1024x1024 PNG）はストア表示用に最低限のクオリティを担保しておく必要があるため、現状アイコンの確認だけは Step E-7 直前に行う。

### Step D-1: プライバシーポリシー（Notion で公開）
1. Notion で新規ページ作成
2. 必須項目:
   - アプリ名・運営者（個人名 or 屋号）・連絡先メール
   - 収集情報: `device_id`（UUID）／`user_name`／スコア
   - 第三者サービス: Google AdMob（広告 ID）／RevenueCat（購入レシート）
   - 利用目的: ランキング表示／広告配信／課金処理
   - データ削除依頼方法（メール連絡）
   - 改定履歴
3. 右上「Share」→「Publish to web」→ 公開 URL をコピー
4. URL は ASC 申請時に使用

> 上記の手順は Step D-1 として独立しているが、Track D 全体としては「プラポリ作成のみ」となる。

---

## 統合・ビルド・申請（Track A 承認 + B/C 完了後）

### Step E-1: App Store Connect でアプリ作成
1. https://appstoreconnect.apple.com →「マイ App」→「+」→「新規 App」
2. プラットフォーム: iOS
3. 名前: `大縄跳びサバイバル`（最大 30 文字、後で変更可）
4. プライマリ言語: 日本語
5. Bundle ID: `com.tatsunobu.ropejump`（プルダウンで選択）
6. SKU: `ROPEJUMP001`（任意の社内識別子）
7. ユーザーアクセス: 「フルアクセス」

### Step E-2: 有料 App 契約（IAP 必須）
1. ASC →「ビジネス」→「契約／税金／口座振替」
2. 「有料 App」契約 →「同意」
3. 銀行口座情報入力（日本のゆうちょ等可、SWIFT コード必要）
4. 税情報フォーム（W-8BEN）入力
5. **承認まで 1-3 営業日**

### Step E-3: IAP 商品作成
1. ASC → 該当アプリ →「収益化」→「App 内課金」
2. 「+」→ **非消耗型（Non-Consumable）**
3. リファレンス名: `広告削除`
4. 製品 ID: **`remove_ads`**（コードと一致）
5. 価格: ¥300（Tier 3）推奨
6. ローカライゼーション（日本語）:
   - 表示名: `広告を削除`
   - 説明: `バナー広告とインタースティシャル広告を非表示にします。`
7. レビュー用スクリーンショット: 1024x1024（仮で OK、後差し替え）
8. 「保存」

### Step E-4: アプリ側統合（コード変更）
- [frontend/.env](frontend/.env) を本番値に更新:
  ```
  EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxxx           # Step C-2
  EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXX/YYYYY  # Step B-3
  EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-XXX/YYY       # Step B-4
  ```

- [frontend/app.json:42-43](frontend/app.json#L42-L43) の AdMob App ID を本番に変更:
  ```json
  "iosAppId": "ca-app-pub-XXXXXXXXXXXX~YYYYYYYY"  // Step B-2
  ```

- **SKAdNetwork 設定**（推奨：ATT ダイアログなしの最小構成）:
  [frontend/app.json](frontend/app.json) の `ios.infoPlist` に AdMob 公式の SKAdNetworkItems リスト
  （https://developers.google.com/admob/ios/ios14 から最新を取得）を追記。

  ※ ATT ダイアログ（追加実装）の判断補足:
    - 実装する: パーソナライズ広告で eCPM 向上だが `expo-tracking-transparency` 導入と権限文言が必要
    - **実装しない（推奨）**: 非パーソナライズ広告となるが、初回申請の難易度が下がる。後の v1.1 で追加可能

### Step E-5: EAS Build（本番 IPA 作成）
```powershell
# 初回のみ
npm install -g eas-cli
eas login

# ビルド実行
cd c:\Users\tatsu\Desktop\なわとび\frontend
eas build --platform ios --profile production
```
- 初回ビルドで Apple Developer 認証 → eas が証明書／プロビジョニングプロファイルを自動作成
- ビルド時間 15-30 分（クラウド実行）
- 完了後 `expo.dev` で IPA をダウンロード可能

### Step E-6: TestFlight アップロード
```powershell
eas submit --platform ios --latest
```
- ASC →「TestFlight」でビルド処理（5-15 分）
- 「内部テスター」に自分の Apple ID を追加
- iPhone に TestFlight アプリをインストール → 招待メールから受け取り
- 実機テスト項目:
  - [ ] バナー広告が表示される
  - [ ] ゲームオーバー時にインタースティシャルが出る
  - [ ] 設定画面で「広告を削除」→ Sandbox 購入が成功
  - [ ] 購入後、広告が消える（再起動しても保持）
  - [ ] 「購入を復元」が動作

### Step E-7: ストア素材
1. **スクリーンショット**（必須サイズ）:
   - 6.7"（iPhone 16 Pro Max 横向き）: `2796x1290` を 3-10 枚
   - 6.5"（iPhone 11 Pro Max 横向き）: `2688x1242`（任意だが推奨）
   - 実機の TestFlight ビルドで撮影 → ASC →「App プレビューとスクリーンショット」にアップロード

2. **アプリ情報**:
   - サブタイトル: `タイミングよくジャンプして連続記録に挑戦！`
   - キーワード（カンマ区切り 100 文字以内）: `なわとび,大縄,ジャンプ,カジュアル,アクション,記録,ランキング`
   - 説明文（4000 文字以内）: ゲーム概要・操作方法・特徴
   - サポート URL: GitHub Issues か個人サイト
   - **マーケティング URL（任意）／プライバシーポリシー URL: Step D-2 の Notion URL**

3. **App Store の表示情報**:
   - カテゴリ: ゲーム → アクション or カジュアル
   - 年齢制限: 4+
   - 著作権: `2026 Tatsunobu Eto`

4. **App プライバシー設定**（重要）:
   - ASC →「App プライバシー」
   - データ収集: あり
   - 収集データ:
     - 識別子 → デバイス ID（追跡なし）
     - ユーザーコンテンツ → ユーザー名（追跡なし）
     - 使用状況データ → 広告データ（**AdMob 経由で追跡あり**）

5. **輸出コンプライアンス**:
   - すでに [frontend/app.json:20](frontend/app.json#L20) で `ITSAppUsesNonExemptEncryption: false` 設定済み

### Step E-8: 審査申請
1. ASC → アプリ →「バージョン」→「審査用に提出」
2. ビルド: TestFlight でテストしたビルドを選択
3. App レビュー情報:
   - 連絡先（自分の名前・電話・メール）
   - デモアカウント: 不要
   - メモ: `タップでジャンプするカジュアルゲームです。広告削除は IAP で実装しています。Sandbox テスト済み。`
4. 「審査へ提出」
5. **審査時間: 通常 1-3 日**。リジェクト時は理由を確認して修正→再提出

---

## 検証セクション（各ステップの完了確認）

| 段階 | 検証コマンド／確認方法 |
|---|---|
| Apple 承認 | `developer.apple.com` のダッシュボードに `Apple Developer Program` メンバーシップ表示 |
| AdMob | 広告ユニット ID が `ca-app-pub-数字/数字` 形式でコピー済み |
| RevenueCat | API キーが `appl_` で始まる文字列でコピー済み |
| App ID 登録 | Apple Developer の Identifiers に Bundle ID が表示／IAP capability チェック済み |
| ASC アプリ | ASC「マイ App」に表示／Bundle ID 一致 |
| IAP 商品 | ASC「App 内課金」に `remove_ads` が「審査の準備ができました」状態 |
| RC ↔ ASC 連携 | RevenueCat の Products に `remove_ads` が同期表示 |
| アプリ統合 | `cd frontend; npx expo start --tunnel` で起動・タイトル画面でテスト広告が表示（ローカルでは本番 ID でも Test 用が出る） |
| EAS Build | `expo.dev` のビルドページで Status: finished／IPA ダウンロード可能 |
| TestFlight | iPhone でアプリ起動 → 上記 6 項目すべてパス |
| 申請 | ASC でステータスが `審査待ち` → `審査中` → `販売準備完了` |

---

## 重要ファイル

| ファイル | 用途 |
|---|---|
| [frontend/app.json](frontend/app.json) | AdMob App ID（L42-43）／SKAdNetworkItems 追加先 |
| [frontend/.env](frontend/.env) | RevenueCat キー／AdMob ユニット ID |
| [frontend/eas.json](frontend/eas.json) | EAS Build 設定（既設定） |
| [frontend/lib/adsafe.ts](frontend/lib/adsafe.ts) | AdMob ラップ（変更不要） |
| [frontend/lib/purchasessafe.ts](frontend/lib/purchasessafe.ts) | RevenueCat ラップ（変更不要） |
| [frontend/assets/icon.png](frontend/assets/icon.png) | ストア表示用アイコン（1024x1024）— 必要に応じて確認のみ |
| [PROGRESS.md](PROGRESS.md) | 各ステップ完了で `[x]` に更新（`6-3 ピクセルアート差し替え` は対象外として残す or 削除） |
| Notion ページ（外部） | プライバシーポリシー本文 |

---

## 補足: 想定費用

| 項目 | 金額 |
|---|---|
| Apple Developer Program | $99 / 年（自動更新） |
| EAS Build（無料枠） | 月 30 ビルドまで無料／超過は $0.50/build |
| AdMob | 無料 |
| RevenueCat | MTR $2,500 まで無料 |
| Notion | 無料プランで公開可能 |
| **合計** | **$99 (約 ¥15,000) / 初年度** |
