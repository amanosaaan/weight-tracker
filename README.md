# 体重管理

体組成計（身長・体重・体脂肪率・骨格筋肉量・内臓脂肪レベル）の測定結果を記録し、時系列グラフで確認できる Web アプリです。

- フロントエンド: 素の HTML / CSS / JavaScript（GitHub Pages で公開）
- データ保存: Google スプレッドシート
- API: Google Apps Script（GAS）のウェブアプリ

認証機能はありません。URL を知っている人は誰でも閲覧・記録・削除ができます。公開範囲に注意してください。

## セットアップ手順

### 1. Google スプレッドシートと Apps Script を用意する

1. Google スプレッドシートを新規作成する（シート名や中身は空でOK）。
2. メニューの「拡張機能」→「Apps Script」を開く。
3. デフォルトで開かれる `Code.gs` の中身を全部消し、このリポジトリの [`apps-script/Code.gs`](apps-script/Code.gs) の内容を貼り付けて保存する。
4. 右上の「デプロイ」→「新しいデプロイ」を選択。
5. 歯車アイコンから種類「ウェブアプリ」を選択し、以下を設定する。
   - 実行するユーザー: **自分**
   - アクセスできるユーザー: **全員**
6. 「デプロイ」をクリックし、発行された **ウェブアプリの URL**（`https://script.google.com/macros/s/.../exec`）をコピーする。

初回アクセス時にシートへ `records` という名前のタブと見出し行が自動作成されます。

### 2. フロントエンドに URL を設定する

[`config.js`](config.js) の `GAS_URL` を、手順1でコピーしたウェブアプリの URL に書き換える。

```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';
```

### 3. GitHub Pages で公開する

1. このフォルダの内容を GitHub リポジトリに push する。
2. リポジトリの Settings → Pages を開く。
3. Source を「Deploy from a branch」、Branch を `main` / `/ (root)` に設定して保存する。
4. 数分後に表示される URL（`https://<ユーザー名>.github.io/<リポジトリ名>/`）にスマホからもアクセスできる。

### 4. Apps Script を更新したとき

`apps-script/Code.gs` を編集した場合は、Apps Script エディタ側にも同じ内容を貼り付け、「デプロイ」→「デプロイを管理」→ 編集（鉛筆アイコン）→ バージョン「新バージョン」を選んで再デプロイする（URL は変わらない）。

## ローカルで試す

```bash
python -m http.server 8000
```

を実行して `http://localhost:8000` を開く（`config.js` に有効な `GAS_URL` が設定済みであること）。
