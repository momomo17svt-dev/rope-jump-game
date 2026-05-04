# CLAUDE.md — 大縄跳びサバイバル

## プロジェクト概要

カジュアル・エンドレスアクションゲーム「大縄跳びサバイバル」の開発リポジトリ。
**Unity (C#) フロントエンド** + **Go バックエンド（Render デプロイ）** の構成。

> **2026-05-04 方針転換:** フロントを React Native (Expo) から Unity (C#) に移行することに決定。
> `frontend/` 配下の旧 RN コードは Unity 側が動くまで参照用に残し、後ほど削除する。
> 詳細プラン: `C:\Users\tatsu\.claude\plans\c-unity-snug-rossum.md`

詳細仕様 → [REQUIREMENTS.md](./REQUIREMENTS.md)
進捗管理 → [PROGRESS.md](./PROGRESS.md)

**リモートリポジトリ:** https://github.com/Tatsunobu-Eto/rope-jump-game.git

---

## 1. ディレクトリ構成

```
なわとび/
├── unity/                  # Unity (C#) フロントエンド
│   └── Assets/
│       ├── Scenes/         # Boot, Title, Game, Result, Ranking
│       ├── Scripts/
│       │   ├── Core/       # GameController, RopeController, PlayerController
│       │   ├── Data/       # LocalDb, LocalUser, LocalScore
│       │   ├── Net/        # ApiClient, ScorePayload, RankingEntry
│       │   └── UI/         # NameInputDialog, TitleScreen, ResultScreen, RankingList
│       ├── Prefabs/
│       └── Plugins/        # sqlite-net-pcl, sqlite3 ネイティブ
├── frontend/               # ⚠️ 旧 RN コード（廃棄予定、参照用）
└── backend/                # Go API サーバー
    ├── main.go
    ├── Dockerfile
    ├── render.yaml
    └── db/
```

---

## 2. 進捗管理のフロー（重要）

以下のサイクルを自律的に回すこと。

1. **現在地の確認:**
   セッション開始時や新しい指示を受けたときは、必ず `PROGRESS.md` を読み込み、現在の完了タスクと次に取り組むべき未完了タスク（`[ ]`）を把握する。

2. **タスクの宣言とブランチ作成:**
   「次は〇〇の実装に入ります」と宣言し、適切な名前で機能ブランチ（例: `feature/xxx`）を切ってから実装を開始する。

3. **実装とユーザーレビュー:**
   コードを実装後、ユーザーに Unity Editor の Play モードまたは実機ビルドでの動作確認を依頼する。ユーザーの直感的なフィードバック（バイブ）を受け取り、何度でも柔軟に修正する。

4. **タスク完了時の処理:**
   ユーザーから OK が出たら、以下の順序で処理を完結させる。
   - `PROGRESS.md` の該当タスクを `[x]` に書き換えて保存する。
   - 変更をコミットし、リモートに Push する。
   - GitHub CLI（フルパス使用）で `main` ブランチへの Pull Request を作成する。PR の Description には実装内容をマークダウンで詳細に記載する。

5. **次のタスクの提案:**
   PR 作成後、「タスク〇〇が完了しました。次は `PROGRESS.md` にある〇〇のタスクに進みますか？」とユーザーに提案する。

---

## 3. Git 運用ルール

- **ブランチ命名:** `feature/機能名` または `fix/バグ名`
- **コミットメッセージ:** 何をなぜ変更したかがわかるように記述
  例: `feat: SQLiteのlocal_userテーブル初期化処理を追加`
- ローカルでの作業完了後に PR を作成し、CI/CD によるクラウドビルドのトリガーを意識する。

---

## 4. 技術スタック

| レイヤー | 技術 |
| :--- | :--- |
| ゲームクライアント | Unity（2D Built-In RP）+ C# |
| 推奨 Unity バージョン | 2022 LTS または 6 LTS |
| ローカル DB | SQLite（sqlite-net-pcl, NuGetForUnity 経由） |
| UUID 生成 | `System.Guid.NewGuid().ToString()` |
| HTTP 通信 | UnityWebRequest（必要に応じて UniTask 導入検討） |
| バックエンド | Go |
| インフラ | Docker / Render |
| DB（本番） | PostgreSQL (Render Managed Database) |
| iOS ビルド | Unity Cloud Build（Mac は用意しない方針） |
| Android ビルド | Unity Editor（Windows）からローカルビルド |

---

## 5. プロジェクト特有の技術的注意点

- グラフィックは Unity の標準機能（SpriteRenderer / LineRenderer / UI Toolkit）でコード描画する。`Assets/` 内の画像は後から差し替え可能なプレースホルダー構成を維持する。
- ローカル SQLite ファイルは `Application.persistentDataPath` 配下に配置する（プラットフォーム差を吸収）。
- 環境変数は Unity 側では `Resources/config.json` などのアセットで管理し、ハードコードしない。バックエンド側は `.env`（ローカル）と Render の環境変数設定で管理。
- 画面の向きはプロジェクト設定で **Landscape Left** 固定、Portrait は Allowed から外す。

---

## 6. よく使うコマンド

```powershell
# Unity（Editor で操作するのが基本。CLI は使わない）
# Play モードでの動作確認は Editor の ▶ ボタン

# バックエンド
cd backend
go run main.go
docker build -t api .
docker run -p 8080:8080 api
```

---

## 7. 開発環境のトラブルシュート

### 7.1 Unity Editor の起動と Play モード

- Unity Hub からプロジェクトを開く → Scene を `Boot` か `Title` に切り替え → ▶ ボタンで Play モード
- Play モードはあくまで動作確認用。Inspector の値変更は Play 終了時にリセットされるので注意

### 7.2 Android 実機ビルド

`File > Build Settings > Android > Switch Platform` で Android に切り替え。
初回は Android SDK / NDK / JDK のセットアップ確認が必要（Unity Hub の Build Support インストール時に同梱される）。
ビルドは `Build` で `.apk`、`Build And Run` で接続中の Android 実機にインストール。

### 7.3 iOS ビルド（Unity Cloud Build）

Mac を用意しない方針のため、iOS ビルドは Unity Cloud Build（Unity DevOps）を使う。

1. Unity Cloud にプロジェクトを連携（GitHub 連携でブランチを Watch）
2. iOS ビルド target を作成
3. Apple Developer Program 登録（年 $99）と Bundle ID / Provisioning Profile を Cloud Build に登録
4. ビルド成果物 `.ipa` を TestFlight 経由で実機配信

### 7.4 SQLite ネイティブが iOS / Android で動かない

`sqlite-net-pcl` は管理コード側のラッパーで、ネイティブ `sqlite3` ライブラリをプラットフォーム別に `Assets/Plugins/` に配置する必要がある。
- iOS: 標準で OS 同梱の sqlite3 を使えるため、Build Settings の Frameworks に `libsqlite3.tbd` を追加
- Android: `libsqlite3.so` を `Assets/Plugins/Android/` に配置（または NuGetForUnity が自動配置するパッケージを利用）

### 7.5 GitHub CLI (`gh`) の呼び出し

このマシンでは `gh` が PATH に通っていないため、フルパスで呼ぶこと。

```bash
# Bash から
"/c/Program Files/GitHub CLI/gh.exe" pr create --base main --head <branch> --title "..." --body "..."
"/c/Program Files/GitHub CLI/gh.exe" auth status
```

```powershell
# PowerShell から
& "C:\Program Files\GitHub CLI\gh.exe" pr create --base main --head <branch> --title "..." --body "..."
```

認証は keyring に保持済み（`Tatsunobu-Eto` アカウント、scopes: `gist, read:org, repo, workflow`）のため、`gh auth login` の再実行は不要。

---

## 8. 環境変数

### `backend/.env`（ローカル開発用）

```
DATABASE_URL=postgres://user:password@localhost:5432/jumprope
PORT=8080
```

### Unity 側の API ベース URL

`Assets/Resources/config.json` などで管理（後の Phase 3 で導入予定）。
ローカル開発時は `http://10.0.2.2:8080`（Android エミュレータからホスト PC を指す）または PC の LAN IP を指定。
