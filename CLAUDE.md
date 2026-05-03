# CLAUDE.md — 大縄跳びサバイバル

## プロジェクト概要

カジュアル・エンドレスアクションゲーム「大縄跳びサバイバル」の開発リポジトリ。  
React Native (Expo) フロントエンド + Go バックエンド（Render デプロイ）の構成。

詳細仕様 → [REQUIREMENTS.md](./REQUIREMENTS.md)  
進捗管理 → [PROGRESS.md](./PROGRESS.md)

**リモートリポジトリ:** https://github.com/Tatsunobu-Eto/rope-jump-game.git

---

## 1. ディレクトリ構成

```
なわとび/
├── frontend/        # React Native (Expo Go) アプリ
│   ├── app/         # 画面（Expo Router）
│   ├── components/  # 再利用UIコンポーネント
│   ├── db/          # SQLite操作
│   ├── hooks/       # カスタムフック
│   └── assets/      # 差し替え用プレースホルダー
└── backend/         # Go APIサーバー
    ├── main.go
    ├── Dockerfile
    ├── render.yaml
    └── db/          # マイグレーション・接続
```

---

## 2. 進捗管理のフロー（重要）

以下のサイクルを自律的に回すこと。

1. **現在地の確認:**  
   セッション開始時や新しい指示を受けたときは、必ず `PROGRESS.md` を読み込み、現在の完了タスクと次に取り組むべき未完了タスク（`[ ]`）を把握する。

2. **タスクの宣言とブランチ作成:**  
   「次は〇〇の実装に入ります」と宣言し、適切な名前で機能ブランチ（例: `feature/xxx`）を切ってから実装を開始する。

3. **実装とユーザーレビュー:**  
   コードを実装後、ユーザーにエミュレータ（Expo Goなど）での動作確認を依頼する。ユーザーの直感的なフィードバック（バイブ）を受け取り、何度でも柔軟に修正する。

4. **タスク完了時の処理:**  
   ユーザーからOKが出たら、以下の順序で処理を完結させる。
   - `PROGRESS.md` の該当タスクを `[x]` に書き換えて保存する。
   - 変更をコミットし、リモートにPushする。
   - GitHub CLI（フルパス使用）で `main` ブランチへのPull Requestを作成する。PRのDescriptionには実装内容をマークダウンで詳細に記載する。

5. **次のタスクの提案:**  
   PR作成後、「タスク〇〇が完了しました。次は `PROGRESS.md` にある〇〇のタスクに進みますか？」とユーザーに提案する。

---

## 3. Git 運用ルール

- **ブランチ命名:** `feature/機能名` または `fix/バグ名`
- **コミットメッセージ:** 何をなぜ変更したかがわかるように記述  
  例: `feat: SQLiteのlocal_userテーブル初期化処理を追加`
- ローカルでの作業完了後にPRを作成し、CI/CDによるクラウドビルドのトリガーを意識する。

---

## 4. 技術スタック

| レイヤー | 技術 |
| :--- | :--- |
| モバイルアプリ | React Native + Expo Go |
| ローカルDB | Expo SQLite |
| UUID生成 | expo-crypto |
| バックエンド | Go |
| インフラ | Docker / Render |
| DB（本番） | PostgreSQL (Render Managed Database) |

---

## 5. プロジェクト特有の技術的注意点

- グラフィックは React Native の View / SVG でコード描画する（外部画像アセット不要）。`assets/` フォルダは後から差し替え可能な構成を維持する。
- 画像をDBに保存する場合は SQLite にバイナリ保存せず、`expo-file-system` でローカルに保存し、そのURI文字列のみをDBに保存する。
- 環境変数は `.env`（ローカル）と Render の環境変数設定で管理し、ハードコードしない。

---

## 6. よく使うコマンド

```bash
# フロントエンド
cd frontend
npx expo start --tunnel   # 動作確認（推奨。理由は §7 参照）
npx expo start            # LAN モード（同一 Wi-Fi 帯域が必要）

# バックエンド
cd backend
go run main.go
docker build -t api .
docker run -p 8080:8080 api
```

---

## 7. 開発環境のトラブルシュート

### 7.1 Expo Go での動作確認は最初からトンネルモードを使う

本プロジェクトは **Windows PC + iPhone の Expo Go** で動作確認する構成。  
デフォルトの LAN モードは Windows Defender ファイアウォールが node.exe をブロックしたり、PC と iPhone が異なる Wi-Fi 帯域（2.4GHz / 5GHz の別 SSID）に居ることで `Unknown error: The request timed out.` で失敗しがち。

**推奨:** ユーザーに動作確認を依頼するときは、最初から以下を案内する。

```bash
npx expo start --tunnel
```

- 初回は `@expo/ngrok` のインストール確認が出るので `y` で進める
- QR コードが `exp://xxx.xxx.exp.direct` 形式で表示される
- ファイアウォールや Wi-Fi 設定に依存しないため最も確実

### 7.2 LAN モードで動かしたい場合の切り分け順

1. iPhone のブラウザで `http://<PCのIP>:8081` を開いて Metro の welcome ページが見えるか
2. Windows Defender ファイアウォールで node.exe / ポート 8081 を許可
3. PC と iPhone が **同じ SSID** に接続されているか（5GHz / 2.4GHz の別 SSID 問題）
4. ルーターの「クライアント分離 / AP isolation」が無効か

### 7.3 ポート 8081 が既に使われている場合

`Port 8081 is being used by another process` が出たら、別ターミナルに残った Expo dev server がいる可能性が高い。`tasklist` / `netstat -ano | findstr :8081` で PID を特定して終了するか、別ポートで起動する。

```bash
npx expo start --tunnel --port 8082
```

### 7.4 GitHub CLI (`gh`) の呼び出し

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

### `frontend/.env`（ローカル開発用）

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```
