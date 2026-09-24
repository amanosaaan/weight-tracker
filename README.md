# 体重管理

体組成計（身長・体重・体脂肪率・骨格筋肉量・内臓脂肪レベル）の測定結果を記録し、時系列グラフで確認できる Web アプリです。

- フロントエンド: 素の HTML / CSS / JavaScript（GitHub Pages で公開）
- データ保存: Google スプレッドシート
- API: Google Apps Script（GAS）のウェブアプリ

公開中の URL: https://amanosaaan.github.io/weight-tracker/

認証機能はありません。URL を知っている人は誰でも閲覧・記録・削除ができます。公開範囲に注意してください。

## 構成

- `index.html` / `style.css` / `app.js`: フロントエンド（GitHub Pages で配信）
- `config.js`: GAS のウェブアプリ URL を保持する設定ファイル
- `apps-script/`: [clasp](https://github.com/google/clasp)（Google公式CLI）で管理する Apps Script プロジェクト
  - `コード.js`: バックエンド本体（`doGet`/`doPost`）
  - `appsscript.json`: マニフェスト。`webapp.access: ANYONE_ANONYMOUS` / `executeAs: USER_DEPLOYING` で匿名アクセス可能なウェブアプリとして設定済み
  - `.clasp.json`: 紐付け先の Apps Script プロジェクト ID

## Apps Script を更新したいとき

`apps-script/` ディレクトリで clasp を使って push・deploy する。

```bash
cd apps-script
npx clasp login      # 初回のみ。ブラウザでGoogleアカウントを認可
npx clasp push        # コードをApps Scriptプロジェクトに反映
npx clasp deploy -d "説明"   # 新しいバージョンをウェブアプリとしてデプロイ
```

`clasp deploy` は毎回新しいデプロイ ID（＝新しい URL）を発行する。既存の URL（`config.js` の `GAS_URL`）を変えずに更新したい場合は、既存デプロイを更新する:

```bash
npx clasp deployments        # 既存のデプロイ ID を確認
npx clasp deploy -i <デプロイID> -d "説明"
```

初回デプロイ後、スプレッドシートへのアクセス許可（OAuth 認可）をオーナーのアカウントで一度承認する必要がある（`https://.../exec` に直接アクセスし、「REVIEW PERMISSIONS」から許可）。

## GitHub Pages への反映

`main` ブランチの `/`(root) を GitHub Pages のソースに設定済み。`git push` するだけで数分後に公開ページへ反映される。

## ローカルで試す

```bash
python -m http.server 8000
```

を実行して `http://localhost:8000` を開く（`config.js` に有効な `GAS_URL` が設定済みであること）。
