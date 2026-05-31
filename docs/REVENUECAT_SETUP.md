# RevenueCat 設定手順書（大縄跳びサバイバル / 広告削除の買い切り）

このアプリの「広告を削除する」買い切り課金を RevenueCat × App Store IAP で実現するための、
**実際に行った操作の記録**。再設定・別環境構築・引き継ぎ時の参照用。

- 課金方式：**非消耗型（買い切り）`remove_ads`** 1つのみ
- 連携：RevenueCat（レシート検証・購入状態管理） × App Store Connect（IAP本体）
- SDK：`react-native-purchases` v10（**StoreKit 2**。In-App Purchase Key が必須）

> ⚠️ コードは「**有効な entitlement が1つでもあれば広告削除**」と判定する（`AdContext.tsx`）。
> entitlement 名は自由でよい。購入時は **`offerings.current` の先頭パッケージ**を購入する。

---

## 0. 実際に使った値（このアプリの設定値）

| 項目 | 値 |
| :-- | :-- |
| App Store Connect アプリ名 | シンプル縄跳び |
| Bundle ID | `com.tatsunobu.ropejump` |
| Apple ID（App Store） | `6774147200` |
| RevenueCat プロジェクト | 大縄跳びサバイバル |
| RevenueCat App Store アプリ名 | 大縄跳びサバイバル (App Store) |
| IAP 製品ID | `remove_ads`（非消耗型） |
| Entitlement | 大縄跳びサバイバル Pro（REST識別子 `ent19e441b02f8`） |
| Offering | `default`（表示名「広告削除」）→ **Current** |
| パッケージ種別 | Lifetime |
| In-App Purchase Key（P8） | Key ID `4SZQS44Z6C` / Issuer ID `2e1c0c6f-e4a6-41d0-9bdd-85e7eb5dab52` |
| RevenueCat iOS Public key | `appl_gvDaaREBnYzBOVEYWdTZChnaWyG` |

> 🔒 **`.p8` ファイル本体は秘密鍵**。リポジトリにコミットしない。Key ID / Issuer ID は識別子なので非秘密。
> `appl_` 公開キーはクライアント埋め込み前提の公開値（`frontend/lib/purchasesConfig.ts` に格納済み）。

---

## 1. 前提：App Store Connect 側の準備

### 1-1. 有料Appの契約（Paid Applications Agreement）
無料アプリでも IAP には**有料App契約が「アクティブ」**である必要がある。
- App Store Connect → **ビジネス → 契約** で確認。未締結なら締結（銀行口座・税務情報の登録が必要）。
- これが無いと RevenueCat 連携も購入テストもできない。

### 1-2. IAP `remove_ads` を作成
App Store Connect → 対象アプリ → 左メニュー **収益化 → アプリ内購入** → **「＋」**
- **タイプ**：非消耗型（Non-Consumable）
- **製品ID**：`remove_ads`（※後で変更不可。RevenueCat 側と完全一致させる）
- **参照名**：広告削除
- **価格**：希望価格（例 ¥160）
- **ローカリゼーション**：表示名（例「広告を削除」）・説明を日本語で入力
- **App Store プロモーション用画像 / 審査用スクリーンショット**：1枚アップロード

> 📌 状態が **「下書き・メタデータが不足」** の場合は上記（特にローカリゼーション/スクショ）が未入力。
> 全部埋めると **「提出準備完了」** になり、RevenueCat の `Could not check` も解消される。
> このIAPは**最初のアプリ申請と同時に審査**される（アプリバージョンに紐付けて App Review へ提出）。

---

## 2. RevenueCat：App Store アプリを登録

左メニュー **Apps（または Project settings → Apps）→ ＋ New → App Store**
（画面名：**New App Store app**）

- **App name**：大縄跳びサバイバル (App Store)
- **App Bundle ID**：`com.tatsunobu.ropejump`（Xcode/アプリ設定と一致）
- **In-app purchase key configuration**（StoreKit 2 で必須）：
  1. App Store Connect → **ユーザーとアクセス → Integrations → アプリ内購入(In-App Purchase)** で **キーを作成**し `.p8` をダウンロード
     - ダウンロードファイル名は `SubscriptionKey_XXXX.p8` 形式
  2. RevenueCat の **「Add new key」** からその `.p8` をアップロード
  3. **Key ID**（例 `4SZQS44Z6C`）・**Issuer ID**（例 `2e1c0c6f-...`）を入力
- 「Apple Small Business Program」「App-specific shared secret (Legacy)」は**触らない**（IAPキーがあれば不要）
- **Save changes**

---

## 3. RevenueCat：Products（商品）

左メニュー **Product catalog → Products → ＋ New product**
（画面名：**New Product**）

- **Identifier**：`remove_ads`（App Store Connect の製品IDと完全一致）
- **Display name**：広告削除
- **Name（顧客向け）**：広告を削除
- **Product type**：**Non-consumable を選択**（※初期値の Auto-renewing subscription から必ず変更）
  - 選ぶと Subscription settings / Duration / Pricing は不要になる
- 対象 **App = 大縄跳びサバイバル (App Store)** の配下に作成する（**Test Store ではない**）
- **Create Product**

> ⚠️ Products 一覧で **Status「Could not check」** が出るのは、App Store Connect 側の IAP が
> 未完成（メタデータ不足）か、Apple への反映待ち（〜数時間）。1-2 を仕上げれば解消する。
> この状態でも Attach・Offering 設定・SDK 連携は先に進めてよい。

---

## 4. RevenueCat：Entitlements（権利）

左メニュー **Product catalog → Entitlements** → 新規作成
- 識別子：任意（このアプリでは「大縄跳びサバイバル Pro」。`ads_removed` 等でも可）
- **Associated products → Attach** で **`remove_ads`（App Store）を紐づける**

> ⚠️ 新規プロジェクトには Test Store のサンプル（Monthly / Yearly / Lifetime）が付くことがある。
> それらは **Detach** してよい。最終的に Entitlement に紐づくのは `remove_ads` だけにする。

---

## 5. RevenueCat：Offerings（提供）

左メニュー **Product catalog → Offerings**
（画面名：**New Offering** / 既存なら **Edit**）

- **Identifier**：`default`（SDKからアクセスする識別子。後で変更不可）
- **Display Name**：広告削除
- **Packages → New Package**：
  - **Identifier**：**Lifetime**（買い切り＝非消耗型に対応）
  - **Description**：広告削除（買い切り）など（必須）
  - **Products**：App Store の行で **広告を削除（remove_ads）** を選択
    - Test Store の行は **No product のままでOK**
- **Save**
- 保存後、この Offering を **「Current（現在）」に設定**（Make current）
  - ※コードは `offerings.current` を見るため **Current 設定が必須**

> ❗ 保存時に **「The offering's display name or identifier already exists for this app.」** が出たら、
> すでに同名 Offering が存在する。**新規作成せず既存の `default` を Edit** して仕上げる。

---

## 6. RevenueCat：API キー → コード反映

左メニュー **API keys** → **Apple App Store の Public key（`appl_` で始まる）** をコピー。

このアプリでは **コードに直書き**（`.env` が CI ビルドに含まれず空になる事故を避けるため）：

| 値 | 置き場所 |
| :-- | :-- |
| RevenueCat iOS Public key（`appl_…`） | `frontend/lib/purchasesConfig.ts` |

`frontend/context/AdContext.tsx` がこのキーを読み、**`appl_` で始まる時のみ** `Purchases.configure()` を実行する
（不正キーでの configure はネイティブ例外で起動クラッシュするためのガード）。
環境変数 `EXPO_PUBLIC_REVENUECAT_IOS_KEY` があればそちらを優先。

> ⚠️ **Secret キー（`sk_…`）や Google 用キーは使わない**。必ず Apple の Public（`appl_`）。

---

## 7. コード側の対応箇所

| ファイル | 役割 |
| :-- | :-- |
| `frontend/lib/purchasesConfig.ts` | `appl_` 公開キーを保持（env 優先） |
| `frontend/lib/purchasessafe.ts` | `react-native-purchases` を安全 require（Expo Go でも落ちない） |
| `frontend/context/AdContext.tsx` | 起動時に configure＋`customerInfo` から `ad_removed` を自動同期 |
| `frontend/app/settings.tsx` | 「広告を削除する」= `getOfferings()→purchasePackage(current.availablePackages[0])`、「購入を復元」= `restorePurchases()` |
| `frontend/db/database.ts` | `local_user.ad_removed` にローカル保存 |

購入/復元の成功時 → `markAdRemoved()` で `ad_removed=1` 保存＋状態更新。
再インストール・データリセットで `ad_removed` が消えても、**起動時に entitlement から自動復元**される。

---

## 8. Sandbox 購入テスト（ビルド配信後）

1. App Store Connect → **ユーザーとアクセス → Sandbox → テスター** を追加（普段と別のメールアドレス）
2. 実機の **設定 → App Store** で一度サインアウト（購入時に Sandbox アカウントを聞かれる）
3. TestFlight でアプリを起動 → 設定画面 → **「広告を削除する」** → Sandbox 購入
4. 確認：
   - 購入後、**バナー枠が消える**（`adRemoved=true`）
   - アプリ削除→再インストール後、起動で**自動的に広告削除が復元**される（entitlement 同期）
   - 「購入を復元」でも復活する

---

## 9. トラブルシュート早見表

| 症状 | 原因 / 対処 |
| :-- | :-- |
| Products が `Could not check` | ASC の IAP が未完成（メタデータ不足）/ 反映待ち。1-2 を仕上げる |
| ASC の IAP が「メタデータが不足」 | ローカリゼーション・価格・審査用スクショ未入力。埋めて「提出準備完了」へ |
| Offering 保存で「already exists」 | 同名 Offering が既存。新規ではなく既存 `default` を Edit |
| Entitlement に Test Store 商品が付く | サンプル。Detach し `remove_ads`（App Store）だけにする |
| 購入時 `getOfferings` が空 | Offering が **Current 未設定** / パッケージに商品未割当 |
| 購入が記録されない | **In-App Purchase Key（P8）未設定**（StoreKit 2 で必須） |
| アプリ起動時クラッシュ | `appl_` 以外のキーで configure していないか確認（ガードで防止済み） |

---

## 10. 残タスク

- [ ] ASC の IAP `remove_ads` のメタデータを完成 →「提出準備完了」
- [ ] RevenueCat Offering `default` を **Current** に設定（未設定なら）
- [ ] アプリ申請時に IAP `remove_ads` をアプリバージョンへ紐付けて App Review に提出
- [ ] Sandbox で購入・復元・自動同期を実機確認
