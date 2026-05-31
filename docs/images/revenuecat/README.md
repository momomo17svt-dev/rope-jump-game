# RevenueCat 手順書用スクリーンショット

`docs/REVENUECAT_SETUP.md` から参照される画像を、**下記のファイル名で**この `docs/images/revenuecat/` に保存してください。
ファイル名さえ合っていれば手順書に自動で表示されます（PNG/JPEG どちらでも可。拡張子は `.png` で統一）。

| ファイル名 | 何の画面か | 手順書の対応セクション |
| :-- | :-- | :-- |
| `01-asc-app-info.png` | App Store Connect「アプリ情報」（バンドルID `com.tatsunobu.ropejump` / Apple ID `6774147200` が見える画面） | §1 前提 |
| `02-asc-iap-list.png` | App Store Connect「アプリ内購入」一覧（下書き `remove_ads`／非消耗型／メタデータが不足） | §1-2 IAP作成 |
| `03-rc-new-appstore-app.png` | RevenueCat「New App Store app」（Bundle ID＋P8キー／Key ID／Issuer ID 入力画面） | §2 App登録 |
| `04-rc-new-product.png` | RevenueCat「New Product」（`remove_ads`／Product type＝Non-consumable） | §3 Products |
| `05-rc-products.png` | RevenueCat「Products」一覧（`remove_ads`／Status `Could not check`） | §3 Products |
| `06-rc-entitlement.png` | RevenueCat「Entitlements」（大縄跳びサバイバル Pro／Associated products） | §4 Entitlements |
| `07-rc-new-offering.png` | RevenueCat「New Offering」（`default`／Package／App Store の Product に「広告を削除」を選択） | §5 Offerings |

## 保存のしかた
1. 各スクショ画像を上の表のファイル名にリネーム
2. このフォルダ（`docs/images/revenuecat/`）に置く
3. コミット＆プッシュ
