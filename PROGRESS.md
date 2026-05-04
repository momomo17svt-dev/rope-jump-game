# 進捗管理 — 大縄跳びサバイバル

> ステータス凡例: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
> **2026-05-04 方針転換:** フロントを React Native (Expo) から **Unity (C#)** へ移行することに決定。Phase 1-1〜1-3 の RN 実装は破棄。Go バックエンドはそのまま流用。

---

## Phase 1: Unity フロント基盤とローカルロジック

### 1-1. Unity 環境構築（ユーザー作業）
- [x] Unity Hub のインストールと Personal ライセンスでサインイン
- [x] Unity Editor（6000.4.5f1 / Unity 6 LTS）と Build Support（Android / iOS / WebGL）のインストール
- [x] Unity Hub からプロジェクト新規作成（テンプレート: Universal 2D / URP、配置先: `unity/`、Product Name: RopeJumpSurvival）

### 1-2. プロジェクト初期設定
- [ ] `Project Settings > Player > Default Orientation = Landscape Left`、Portrait を Allowed から外す
- [ ] ディレクトリ構成（`Assets/Scenes`, `Assets/Scripts/{Core,Data,Net,UI}`, `Assets/Prefabs`, `Assets/Plugins`）の作成
- [ ] NuGetForUnity のインストールと `sqlite-net-pcl` の取得
- [ ] iOS/Android 用 sqlite3 ネイティブの `Plugins/` 配置とプラットフォーム別設定

### 1-3. シーンと画面遷移
- [ ] `Boot` シーン（初回起動チェックと遷移分岐）
- [ ] `Title` シーン（タイトル + 自己ベスト表示 + START / ランキング ボタン）
- [ ] `Game` シーン（ゲーム本体）
- [ ] `Result` シーン（スコア表示 + NEW RECORD 演出 + リトライ / タイトルへ）
- [ ] `Ranking` シーン（プレースホルダー UI）
- [ ] `SceneManager.LoadScene` による画面遷移の配線

### 1-4. ローカル DB（SQLite）
- [ ] `LocalDb.cs`（接続管理、`Application.persistentDataPath` 配下に配置）
- [ ] `local_user` テーブル（device_id, user_name）の作成と CRUD
- [ ] `local_scores` テーブルの作成と保存処理
- [ ] 自己ベスト（MAX(score)）取得メソッド

### 1-5. 初回起動ダイアログ
- [ ] `local_user` 存在チェック → 未登録なら名前入力 UI を表示
- [ ] 1〜12 文字バリデーション
- [ ] `System.Guid.NewGuid().ToString()` で device_id 発行・保存

### 1-6. コアゲームロジック
- [ ] 縄を回すキャラクター（左右端）の描画
- [ ] プレイヤーキャラクターの描画（中央）
- [ ] 縄の回転アニメーション（Transform.Rotate or LineRenderer）
- [ ] タップジャンプ処理（Y 座標の上昇 → 下降 → 着地）
- [ ] 当たり判定（縄が最下点を通過する瞬間にプレイヤーが安全な高さにあるか）
- [ ] 「3, 2, 1, GO!」カウントダウン
- [ ] スコア 10 ごとの縄速度上昇（×1.05）
- [ ] ゲームオーバー検出と Result シーンへの遷移

### 1-7. スコア保存と自己ベスト表示
- [ ] プレイ終了時に `local_scores` へスコアを保存
- [ ] Title シーンで自己ベスト表示
- [ ] Result シーンで自己ベスト比較と NEW RECORD 演出

---

## Phase 2: バックエンド API の構築（Unity 移行の影響なし）

### 2-1. プロジェクトセットアップ
- [ ] `backend/` ディレクトリの作成と `go mod init`
- [ ] `Dockerfile` の作成
- [ ] `render.yaml` の作成（Web Service + Managed Database）

### 2-2. データベース
- [ ] `global_rankings` テーブルのスキーマ定義
- [ ] マイグレーションスクリプトの作成
- [ ] PostgreSQL 接続設定（環境変数で管理）

### 2-3. API エンドポイント
- [ ] `POST /api/scores` — スコアの Upsert 処理（`device_id` キーで上書き）
- [ ] `GET /api/rankings` — 上位 100 件の取得
- [ ] ヘルスチェックエンドポイント（`GET /health`）

### 2-4. デプロイ
- [ ] Render へのデプロイと動作確認

---

## Phase 3: Unity と API の統合

### 3-1. ランキング画面
- [ ] `UnityWebRequest.Get` で `GET /api/rankings` から取得
- [ ] ランキングリストの UI 実装（順位・ユーザー名・スコア）
- [ ] `device_id` による自分のエントリーのハイライト表示
- [ ] ローディング・エラー状態の UI

### 3-2. スコア送信
- [ ] Result シーンで自己ベスト更新時に `POST /api/scores` を非同期送信
- [ ] オンライン判定（送信失敗時はサイレントに無視）

---

## Phase 4: ビルドと配信

### 4-1. Android ビルド
- [ ] Android ローカルビルド（`.apk`）の動作確認
- [ ] 実機 / エミュレータでのプレイ確認

### 4-2. iOS ビルド（Unity Cloud Build）
- [ ] Apple Developer Program 登録
- [ ] Unity Cloud Build の連携設定
- [ ] iOS ビルド target 作成と `.ipa` 生成
- [ ] TestFlight などでの実機確認

---

## バックログ（将来対応）

- [ ] サウンドエフェクト（ジャンプ音・ゲームオーバー音）
- [ ] BGM
- [ ] ピクセルアートへのグラフィック差し替え
- [ ] ランキングへのユーザー名変更機能
- [ ] App Store / Google Play への申請

---

## 廃棄済み（参照用ログ）

- 旧 RN/Expo 実装（`frontend/`）: Phase 1-1〜1-3 まで完了していたが、2026-05-04 に Unity 移行決定により破棄方針。`frontend/` ディレクトリは Unity 側が動くまで残し、後ほど削除する。
