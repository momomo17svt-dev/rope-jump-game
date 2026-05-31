# 進捗管理 — 大縄跳びサバイバル

> ステータス凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了

---

## Phase 1: フロントエンド基盤とローカルロジック

### 1-1. プロジェクトセットアップ
- [x] Expoプロジェクト初期化 (`expo init`)
- [x] 横画面固定の設定 (`app.json`)
- [x] Expo Routerの導入とディレクトリ構成の作成
- [x] 依存パッケージのインストール (`expo-sqlite`, `expo-crypto`, `expo-screen-orientation`)

### 1-2. 初回起動ダイアログ
- [x] `local_user` テーブルの作成（SQLite）
- [x] 起動時の `local_user` 存在チェック
- [x] ユーザー名入力UIの実装（1〜12文字バリデーション） ※iOS Expo Goで`<Modal>`がクラッシュするため条件レンダリングで実装
- [x] `device_id`（UUID）生成と `local_user` への保存

### 1-3. 画面ルーティング
- [x] タイトル画面の雛形
- [x] ゲーム画面の雛形
- [x] リザルト画面の雛形
- [x] ランキング画面の雛形（オフライン用プレースホルダー）

### 1-4. コアゲームロジック
- [x] 縄の回転アニメーション（コード描画）
- [x] 縄を回すキャラクターの描画（左右端）
- [x] プレイヤーキャラクターの描画（中央） ※差し替え可能なPNGアセットを使用
- [x] タップジャンプ処理（上昇・下降・着地アニメーション）
- [x] 当たり判定ロジック
- [x] 「3, 2, 1, GO!」カウントダウン
- [x] スコア10ごとの縄速度上昇（+5%） ※実装は5回ごとに残り周期×0.93で加速（最小220ms）に調整
- [x] ゲームオーバー検出とリザルト画面遷移

### 1-5. ローカルデータ管理
- [x] `local_scores` テーブルの作成（SQLite）
- [x] プレイ終了時のスコア保存
- [x] 自己ベスト（`MAX(score)`）の取得とタイトル画面への表示

---

## Phase 2: バックエンドAPIの構築

### 2-1. プロジェクトセットアップ
- [x] `backend/` ディレクトリの作成と `go mod init`
- [x] `Dockerfile` の作成
- [x] `render.yaml` の作成（Web Service のみ。DB は Neon を別途使用）

### 2-2. データベース
- [x] `global_rankings` テーブルのスキーマ定義
- [x] マイグレーションスクリプトの作成
- [x] PostgreSQL接続設定（環境変数で管理）

### 2-3. APIエンドポイント
- [x] `POST /api/scores` — スコアのUpsert処理（`device_id` キーで上書き）
- [x] `GET /api/rankings` — 上位100件の取得
- [x] ヘルスチェックエンドポイント（`GET /health`）

### 2-4. デプロイ
- [x] Render Web Service + Neon へのデプロイと動作確認

---

## Phase 3: フロントエンドとAPIの統合

### 3-1. ランキング画面
- [x] `GET /api/rankings` からデータ取得
- [x] ランキングリストのUI実装（順位・ユーザー名・スコア）
- [x] `device_id` による自分のエントリーのハイライト表示
- [x] ローディング・エラー状態のUI

### 3-2. スコア送信
- [x] リザルト画面で自己ベスト更新時の `POST /api/scores` 非同期送信
- [x] オンライン判定（送信失敗時はサイレントに無視）

---

## Phase 4: 設定機能

### 4-1. DB拡張
- [x] `local_user` に `avatar_stand_uri` / `avatar_jump_uri` カラムを追加（マイグレーション対応）
- [x] `updateUserName` / `updateAvatarUris` / `getLocalUser`（拡張版）関数を追加

### 4-2. 設定画面
- [x] `app/settings.tsx` の新規作成
- [x] ユーザー名変更UI（バリデーション・重複チェック・保存）
- [x] 「立ち」アバター変更UI（expo-image-picker・プレビュー・デフォルト戻し）
- [x] 「ジャンプ」アバター変更UI（同上）

### 4-3. タイトル画面
- [x] 右上に設定アイコンボタンを追加

### 4-4. ゲーム画面
- [x] アバターURIをDBから読み込みプレイヤー画像に反映（正方形表示・フォールバックあり）

### 4-6. プレイ履歴画面
- [x] `getScoreHistory()` 関数追加（全履歴を新しい順に取得）
- [x] `app/history.tsx` 新規作成（プレイ回数・スコア・日時・BESTハイライト）
- [x] タイトル画面に「履歴」ボタンをランキングと並べて追加

### 4-5. バックエンド改善
- [x] POST /api/scores を INSERT → UPSERT に修正（device_id キーで1行管理）
- [x] GET /api/check-username で重複チェックエンドポイント追加
- [x] PATCH /api/profile でユーザー名のみ更新（last_played_at を変えない）
- [x] score_history テーブルを追加し週間ランキングを「今週内ベスト」に変更

---

---

## Phase 5: 難易度調整・鬼畜仕様

### 5-1. スローフェイント
- [x] `basePeriodRef` で正規速度を管理（スピードアップ時に更新）
- [x] スコア10以上・20%確率・750ms間だけ縄を2.2倍に減速、その後元速度へスナップバック
- [x] フェイント中にスピードアップタイミングが重なっても正規速度が正しく累積されるよう対応

---

## Phase 6: 収益化

> 使用サービス一覧
> - **広告配信:** Google AdMob（[admob.google.com](https://admob.google.com)）
> - **課金管理:** RevenueCat（[app.revenuecat.com](https://app.revenuecat.com)）— App Store IAP のレシート検証・復元を担当
> - **ネイティブビルド:** EAS Build（[expo.dev](https://expo.dev)）— Expo Go では動作しないネイティブモジュールのビルドに使用
> - **ストア:** App Store Connect（[appstoreconnect.apple.com](https://appstoreconnect.apple.com)）
> - **Apple Developer Program:** 年 $99（EAS ビルド・ストア申請に必須）

### 6-1. 広告（AdMob）
- [x] `react-native-google-mobile-ads` を導入
- [x] タイトル画面下部にバナー広告を表示（`ad_removed` が false の場合のみ）
- [x] リザルト画面でインタースティシャル広告を表示（ゲームオーバー時）
- [x] Expo Go 互換対応（`lib/adsafe.ts` で try/catch ラップ）
- [ ] AdMob アカウントでアプリ登録・本番 App ID を `app.json` に設定
- [ ] バナー・インタースティシャルの本番広告ユニット ID を `frontend/.env` に設定

### 6-2. 課金（RevenueCat × App Store IAP）
- [x] `react-native-purchases` を導入
- [x] `local_user` テーブルに `ad_removed` カラムを追加（マイグレーション対応）
- [x] `context/AdContext.tsx` で `adRemoved` 状態をアプリ全体に共有
- [x] 設定画面に「広告を削除する」ボタン・「購入を復元」ボタンを追加
- [x] Expo Go 互換対応（`lib/purchasessafe.ts` で try/catch ラップ）
- [ ] RevenueCat プロジェクト作成・iOS Public API キーを `frontend/.env` に設定
- [ ] App Store Connect で非消耗型課金商品（`remove_ads`）を作成
- [ ] RevenueCat ダッシュボードで App Store と連携・Offering を設定

### 6-3. ストア申請
- [ ] Apple Developer Program 登録（年 $99）
- [x] Codemagic + EAS Build (`--local`) で本番 IPA をビルド・TestFlight へ配信
- [~] TestFlight で実機テスト（起動・BGM/SE・UI は確認済み。広告/課金は本番キー設定後に確認）
- [ ] App Store Connect でアプリ情報・スクリーンショット・プライバシーポリシーを整備
- [ ] App Store 審査申請
- [ ] ピクセルアートへのグラフィック差し替え（申請前推奨）

---

## Phase 7: iOS 実機ビルド安定化 & UI 整備（2026-05-30）

### 7-1. 起動クラッシュの解消
- [x] 根本原因特定：`.env` が `.gitignore` 除外で Codemagic ビルドに含まれず
      `EXPO_PUBLIC_API_BASE_URL` 未定義 → `API_BASE=''` → `fetch('/health')` が
      相対URLで `TypeError: Invalid URL` を同期throw → 起動時 RCTFatal/abort
- [x] `lib/api.ts` で `API_BASE` を本番URLフォールバック付きで一元化（空にならない）
- [x] `lib/installErrorHandler` + `components/ErrorBoundary` で未捕捉エラーを画面表示（診断網）
- [x] Xcode 26 で RN0.81 同梱 fmt 11.0.2 が consteval でビルド不可 →
      config plugin `withFmtConsteval` で `Pods/fmt/include/fmt/base.h` をパッチ

### 7-2. 音声
- [x] 非推奨 `expo-av` → `expo-audio` へ移行（TopBGM / PlayBGM / GameSounds）
- [x] TOP画面でのゲームBGM重複を修正（停止時に pause→remove）
- [x] ジャンプ音の鳴り損ねを修正（`seekTo(0)` 完了後に `play`）

### 7-3. 広告枠・課金
- [x] `components/BannerSlot` でバナー枠を事前確保＋レスポンシブ（ANCHORED_ADAPTIVE）
- [x] 広告削除購入時は枠ごと非表示（買い切りは広告削除のみ）

### 7-4. 設定画面
- [x] 「アプリについて」追加：アプリを評価する（App Store）/ プライバシーポリシー /
      利用規約 / バージョン表示
- [x] アプリアイコン表示＋クレジット/謝辞（BGMer）を追加。内容は `lib/credits.ts` に一元化

### 7-5. 公開準備（2026-05-31）
- [x] アプリアイコンをマルチーズがなわとびするデザインに確定（icon/adaptive/splash）。
      中身が JPEG だった3アセットを真の不透明 PNG（1024x1024 RGB）へ変換
- [x] ATT（App Tracking Transparency）対応：`expo-tracking-transparency` 導入、
      起動時に許可要求（`lib/tracking.ts` で安全ラップ）
- [x] 週間ランキング欠落バグ修正：スコア送信ゲートを撤去し常時送信（`score_history` を確実記録）
- [x] 広告削除フラグの自動同期：起動時に RevenueCat の entitlement から `ad_removed` を復元
      （再インストール／リセットでも購入が自動復活。configure は AdContext に集約）
- [x] `supportsTablet: false`（iPad 対応オフで審査を簡素化）
- [ ] AdMob 本番 App ID / 広告ユニット ID を設定（コンソール作業＋Codemagic env）
- [ ] ATT/UMP の同意フロー詳細・プライバシー栄養表示の申告
- [ ] RevenueCat 本番キー・IAP商品 `remove_ads`・Offering 設定（コンソール作業）
- [ ] ランキングへのアバター画像表示（圧縮画像をテーブル列に格納する方針・実装は未着手）
