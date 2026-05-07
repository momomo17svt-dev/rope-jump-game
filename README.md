# 大縄跳びサバイバル

カジュアル・エンドレスアクションゲーム。迫りくる大縄をタイミングよくタップで跳び続け、グローバルランキングで世界と競う。

## スクリーンショット

> ゲーム画面・ランキング画面のスクリーンショットをここに追加予定

## 機能

- タップ操作でジャンプ、連続成功回数を競うシングルプレイ
- 5回ごとに縄が加速する難易度上昇システム（最小220ms）
- スコア10以上で発動するスローフェイント（縄が突然遅くなり油断を誘う）
- グローバルランキング（上位100件）へのスコア自動送信
- プレイヤー名・アバター画像のカスタマイズ
- プレイ履歴の確認
- AdMob 広告 / RevenueCat による広告削除 IAP

## アーキテクチャ

```
frontend/          # React Native (Expo) アプリ
│  app/            # 画面（Expo Router）
│  components/     # 再利用UIコンポーネント
│  db/             # SQLite操作
│  hooks/          # カスタムフック
│  lib/            # AdMob / RevenueCat セーフラッパー
│  context/        # AdContext（広告削除状態の共有）
└  assets/         # 差し替え用プレースホルダー

backend/           # Go APIサーバー
│  main.go
│  Dockerfile
│  render.yaml
└  db/             # マイグレーション・接続
```

## 技術スタック

| レイヤー | 技術 |
| :--- | :--- |
| モバイルアプリ | React Native + Expo Go |
| ローカルDB | Expo SQLite |
| バックエンド | Go（Docker） |
| インフラ | Render Web Service |
| 本番DB | PostgreSQL（Neon） |
| 広告 | Google AdMob |
| 課金管理 | RevenueCat |

## API

ベースURL: `https://rope-jump-game.onrender.com`

| メソッド | エンドポイント | 説明 |
| :--- | :--- | :--- |
| GET | `/health` | ヘルスチェック |
| GET | `/api/rankings` | グローバルランキング上位100件 |
| POST | `/api/scores` | スコア送信（device_idで Upsert） |
| GET | `/api/check-username` | ユーザー名重複チェック |
| PATCH | `/api/profile` | プロフィール更新 |

## セットアップ

### フロントエンド

```bash
cd frontend
npm install
cp .env.example .env   # API URLを設定
npx expo start --tunnel
```

### バックエンド

```bash
cd backend
cp .env.example .env   # DATABASE_URLを設定
go run main.go
```

## 開発フロー

1. `feature/機能名` ブランチを切る
2. 実装・Expo Go で動作確認
3. PR を作成して `main` にマージ
4. Render が自動デプロイ

## ライセンス

MIT
