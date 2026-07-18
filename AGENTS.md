## ひかりの備忘録
Docusaurus による個人ブログ

### ファイル配置
- ブログ本文 (日本語): `/blog/<blog-file-name>.md`
- ブログ本文 (英語): `/i18n/en/docusaurus-plugin-content-blog/<blog-file-name>.md`
- 画像: `/static/img/blog/<blog-file-name>/<image>`

### プロジェクト構成
- `/blog/` — ブログ記事 (Markdown)
- `/docs/` — ドキュメント
- `/src/` — カスタムコンポーネント・ページ
- `/static/` — 静的ファイル（画像など）
- `/i18n/` — 多言語対応ファイル
- `docusaurus.config.ts` — Docusaurus 設定

---

## ミニアプリ (`/src/pages/*.tsx`) の i18n 対応

`/mini-apps` 一覧および各ミニアプリページ (`base64` / `cert-generator` / `doc` / `hash` / `nslookup` / `password-generator` / `svg-to-ico` / `tsv-to-markdown` / `uuid` / `webp-converter` / `whois` / `yaml-json` / `chat` など) は `@docusaurus/Translate` の `<Translate id="...">日本語デフォルト</Translate>` / `translate({id, message})` を使って全文言をラップする。ハードコードされた日本語文字列を残さないこと。

新しいミニアプリを追加した、または既存ミニアプリに文言を追加・変更した場合は、翻訳データが古いまま残らないよう次の手順を実施する。

1. コンポーネント側で `Translate` / `translate()` を使い、`id` は `<ミニアプリ名>.<キー>` 形式にする (例: `hash.title`)。
2. `npx docusaurus write-translations --locale ja` を実行し、`i18n/ja/code.json` に新規キーを反映する (常に日本語がソース)。
3. `npx docusaurus write-translations --locale en` / `--locale zh-TW` を実行し、`i18n/en/code.json` / `i18n/zh-TW/code.json` に不足キーを日本語プレースホルダーとして追加する。
4. 追加された英語・繁體中文キーを実際の翻訳文に書き換える (`Base64` `JSON` `YAML` `Markdown` などの技術用語・固有名詞はそのまま流用してよい)。
5. `pnpm run build` を実行し、3 ロケール (`build/` `build/en/` `build/zh-TW/`) すべてが正常にビルドされることを確認する。

### 注意: 動的な `id` は `write-translations` で抽出されない

`src/pages/mini-apps.tsx` のように、`id` を変数 (配列のプロパティなど) から渡す `<Translate id={app.titleId}>{app.titleMessage}</Translate>` は、`docusaurus write-translations` の静的解析では検出されない (`id` が文字列リテラルでないため)。そのため `miniApps.<app>.title` / `miniApps.<app>.description` などのキーは自動生成されず、`i18n/{en,zh-TW}/code.json` に手動で追加しないと日本語のまま表示され続ける (ja ロケールは `Translate` の子要素が日本語のフォールバックになるため気づきにくい)。

ミニアプリを `mini-apps.tsx` の `MINI_APPS` 配列に追加する際は、`write-translations` 実行後に該当する `miniApps.*` キーが `i18n/en/code.json` / `i18n/zh-TW/code.json` に増えているか必ず確認し、増えていなければ手動で追記して翻訳すること。

---

## 日本語スタイルガイド

### 基本ルール
- 文章は**である調**で統一する。
- 見出しは `##` (h2) から始める。

### 1. 句読点
- 文末は全角句点 (。) 、文中区切りは全角読点 (、) を使用する。
- 疑問符・感嘆符は**半角** (`?` `!`) を使用し、直前の全角文字との間にスペースを入れない。
  - 正：`保存しますか?`  誤：`保存しますか？`
- コロンは**半角** (`:`) を使用し、直前の全角文字との間にスペースを入れない。
  - 正：`フォント:`  誤：`フォント：`
- 波ダッシュ (`～`) は使用しない。数値範囲は「から」または半角ハイフン (`-`) を使用する。
  - 正：`0 から 99` または `0 - 99`  誤：`0 ～ 99`
- 省略記号は半角ピリオド 3 つ (`...`) を使用する。

### 2. カタカナ
- カタカナは全角を使用する。
- **長音符のルール** (`-er`, `-or`, `-ar` で終わる英単語は長音符を付ける)
  - 正：`コンピューター` `オペレーター` 誤：`コンピュータ` `オペレータ`
- カタカナ表記が 4 文字未満の場合は長音符を付ける (促音・拗音はカウントしない)
  - 正：`キュー` (2 文字) `メニュー` (3 文字)
- 4 文字以上の場合は長音符を付けない
  - 正：`メモリ` (4 文字) `プロシージャ` (6 文字)
- 英語複合語のカタカナ語は英語にスペースがある場合に半角スペースを入れる
  - 正：`ダイアログ ボックス` `メニュー コマンド`
- ログオン・チェックインなど副詞を含む動詞はスペースなし
  - 正：`ログオン` `チェックイン`

### 3. スペース
- 全角文字と半角文字の間には半角スペースを入れる
  - 正：`Word を使用するときは` `第 3 章` `Shift キー`
- ただし以下の場合はスペースを入れない
  - 全角句点・読点と半角文字の間
  - 疑問符・感嘆符・コロン・省略記号 (`?` `!` `:` `...`) と直前の全角文字の間
  - スラッシュ (`/`) の前後
  - 度 (`°`) の前 (例：`45°`)
  - UI のアクセスキーを囲む括弧と文字の間 (例：`保存 (S)`)

### 4. 数字
- 数値はアラビア数字 (半角) を使用する
  - 正：`1 つ` `1 月`  誤：`ひとつ` `一月`
- ただし置き換えられない固定表現は漢数字を使用する
  - 正：`もう一度` `四捨五入`  誤：`もう 1 度` `4 捨 5 入`
- 数値と単位の間には半角スペースを入れる (`%` と `mm` (写真文脈) を除く)
  - 正：`3 kg` `50%`

### 5. 括弧・引用符

**丸括弧は必ず半角 `()` を使用する。全角 `（）` は使用禁止。**

| 用途 | 記号 | 例 |
|------|------|----|
| 補足・説明 | 半角 `()` + 前後スペース | `あいさつ (例: こんにちは)` |
| UI アイテムの参照 | 半角 `[]` | `[OK] をクリック` |
| アクセスキー | 半角 `()` + 前後スペースなし | `保存 (S)` |
| ヘルプトピック・章節タイトル・入力テキストの参照 | 全角 `「」` | `「セキュリティ」を参照` |
| 書籍・文書の参照 | 全角 `『』` | `『SQL Server ガイド』` |
| 画面に表示されるテキストの強調 | 半角 `""` | `"M" という文字` |
| 外国人名・国名の区切り | 全角中点 `・` | `エイブラハム・リンカーン` |

### 6. 文体
- 本文は**である調**を基本とする。
- 見出し・メニュー・ボタンラベルは**体言止め**にする。
- 使役形 (`〜させる`) は必要な場合を除き使用しない
  - 正：`ダイアログ ボックスを移動する。`  誤：`移動させる。`
- 動作の名詞化を避ける
  - 正：`インストールする。`  誤：`インストールを実行する。`
- 二重否定を避ける
  - 正：`危険にさらされる。`  誤：`安全ではない。`

### 7. 敬語
- 尊敬語・謙譲語は原則使用しない。
- ただし顧客向けコンテキストでは適切な丁寧語を使用する
  - 正：`ご確認ください` `お問い合わせください` `もう一度お試しください`
  - 誤：`確認してください` `問い合わせてください` `再試行してください`
- `Do you want to...?` → `〜しますか?` (`よろしいですか?` は不可)

### 8. 主語・代名詞
- 一人称 (we/our) は省略する。必要な場合は `私たち`
- 二人称 (you/your) は省略する。必要な場合は `あなた` 等の役割で表現する
- 無生物主語の動作は受動態で表現する
  - 正：`デバイスが検出される。`  誤：`コンポーネントがデバイスを検出する。`

### 9. 用語・表現
- 日常的な表現を優先する
  - 正：`アプリ`  誤：`アプリケーション`
  - 正：`メール`  誤：`電子メール`
  - 正：`もう一度`  誤：`再度`
  - 正：`詳しい`  誤：`詳細な`
- ジャーゴンを避ける
  - 正：`Windows を起動します。`  誤：`Windows を立ち上げます。`
- 冗長な表現を避ける
  - 正：`各ファイルの`  誤：`各ファイルごとの`

### 10. 英数字
- 英字・数字は半角を使用する。
- キー名の大文字化：`CapsLock` `NumLock` `PageDown` (単語をつなげて各先頭を大文字に)
- ショートカットキーはプラス符号で区切る (UI 内ではスペースなし、文書内ではスペースあり)
  - 文書：`Ctrl + Tab`

---

## ブログ記事の作成

### ファイル命名規則
`YYYY-MM-DD-slug.md` 形式。日付は記事の公開日。slug は記事内容を表す英語のケバブケース（例: `install-docker`）。

### フロントマター
```yaml
---
title: （日本語タイトル）
authors: hikari
tags: [タグ1, タグ2]
---
```
- `authors` は常に `hikari`（`blog/authors.yml` で定義済み）。
- `tags` は記事の内容に合わせた適切なタグを選ぶ（英語または日本語）。
- フロントマターに `description` や `image` は不要（既存スタイルに合わせる）。

### 作成手順
1. **既存記事の確認** — `blog/` ディレクトリ内の最近の記事を読み、文体・構成・タグの傾向を把握する。
2. **ファイル名の決定** — 形式は `YYYY-MM-DD-slug.md`。日付は今日の日付を使用する。
3. **フロントマターの作成** — 上記の形式に従う。
4. **記事本文の作成**
   - 冒頭に記事の概要を1〜2文で書く（`<!-- truncate -->` の前に置くことで一覧ページに表示される）。
   - 適切な見出し（## / ###）で構成する。
   - コードブロックには言語を指定する（```bash, ```yaml など）。
   - 文体は上記スタイルガイドに従う（である調）。
5. **ファイルの書き込み** — `blog/YYYY-MM-DD-slug.md` にファイルを作成する。

### 多言語版記事の作成
各言語版はすべて日本語版と **同じファイル名** を使用する。`tags` は日本語版と同じ値を使用する。コードブロックはそのまま流用する。

#### 翻訳スクリプト
```ps1
uv tool install git+https://github.com/Himeyama/translate-mcp
```

```ps1
# 日本語 -> 英語
translate `
  --input blog/2024-04-20-pyplot.md --from Japanese --to English `
  --model gpt-5-mini `
  --output i18n/en/docusaurus-plugin-content-blog/2024-04-20-pyplot.md

# 日本語 -> 台湾語
translate `
  --input blog/2024-04-20-pyplot.md --from Japanese --to Taiwanese `
  --model gpt-5-mini `
  --output i18n/zh-TW/docusaurus-plugin-content-blog/2024-04-20-pyplot.md
```

#### 英語版
- **配置先**: `i18n/en/docusaurus-plugin-content-blog/YYYY-MM-DD-slug.md`
- **タイトル**: 日本語タイトルを英語に翻訳する。
- **本文**: 日本語版の内容を英語に翻訳する。

```yaml
---
title: (English title)
authors: hikari
tags: [tag1, tag2]
---
```

#### 台湾版（繁体字中国語）
- **配置先**: `i18n/zh-TW/docusaurus-plugin-content-blog/YYYY-MM-DD-slug.md`
- **タイトル**: 日本語タイトルを繁体字中国語に翻訳する。
- **本文**: 日本語版の内容を繁体字中国語（台湾）に翻訳する。台湾で一般的に使われる表現・用語を使用する。

```yaml
---
title: （繁體中文標題）
authors: hikari
tags: [tag1, tag2]
---
```

#### 注意事項
- 日本語記事は `blog/` に、英語記事は `i18n/en/docusaurus-plugin-content-blog/` に、台湾版は `i18n/zh-TW/docusaurus-plugin-content-blog/` に作成する。
- コマンドや技術用語は英語のまま使用する。

---

## OGP 画像
- Docusaurus はフロントマターの `image:` から記事ごとの OGP 画像を自動設定する。
- 新しいブログ記事を作成する際は、記事内の代表画像を `image:` に設定すること。
  ```yaml
  ---
  title: 記事タイトル
  image: /img/blog/YYYY-MM-DD-slug/thumbnail.png
  ---
  ```
- `image:` が未設定の場合、タグベースのグラデーション PNG (`/img/ogp/SLUG.png`) が使われる。
  - 画像は `scripts/generate-ogp.js` で生成済み（外部ライブラリ不要）。
  - 新記事を追加して `image:` を設定しない場合は `node scripts/generate-ogp.js` を再実行すること。
  - 特定記事のみ生成する場合は `--file` オプションを使う: `node scripts/generate-ogp.js --file 2026-04-20-slug.md`
  - タグと色の対応は同スクリプト内の `TAG_COLORS` を編集して変更できる。
- パスに括弧 `()` を含む画像も YAML フロントマターには直接記述できる（Markdown リンク構文とは異なる）。

## JSON-LD (構造化データ)
- BlogPosting の JSON-LD は Docusaurus 標準の `BlogPostPage/StructuredData` が出力する。
- `src/theme/BlogPostItem/index.tsx` では JSON-LD を出力しないこと（重複になる）。
- キーワードは `src/theme/BlogPostPage/StructuredData/index.tsx` で `frontMatter.keywords` → `tags` の順にフォールバックして自動設定される。記事に明示的に keywords を設定したい場合はフロントマターに追加する。
  ```yaml
  keywords: [キーワード1, キーワード2]
  ```

## Git
- プッシュ前に必ず `pnpm run build` を実行し、ビルドが成功することを確認すること。

---

## 管理画面 (CMS) — `/admin`

ブログ記事を編集する Web エディタを `/admin` に配置している。

### 構成

| 場所 | 役割 |
|---|---|
| `src/pages/admin/index.tsx` | Docusaurus ページ (BrowserOnly ラッパー) |
| `src/components/admin/` | エディタ UI (React 19) |
| `src/lib/admin/` | API クライアント・OpenAI 連携・ユーティリティ |
| `src/css/admin.css` | 管理画面 CSS (全クラスに `admin-` プレフィックス) |
| `workers/` | Cloudflare Workers (CMS API、別デプロイ) |

### エディタ機能

- 言語切り替え (ja / en / 繁體中文) — サイドバーで切替
- CodeMirror 6 エディタ (markdown、ライトテーマ、画像 D&D 対応)
- markdown-it + DOMPurify ライブプレビュー
- localStorage オートセーブ (2 秒デバウンス)
- Frontmatter フォーム (title / slug / date / tags / image / keywords / draft / authors)
- AI 機能 (OpenAI):
  - **AI 本文生成** — タイトル + タグから記事本文を Markdown で生成
  - **EN/繁中翻訳** — ja 本文から英語・繁體中文に並列翻訳。タブで確認後、各言語別の記事ファイルとして保存
- 画像アップロード — `static/img/blog/{date}-{slug}/` に GitHub Contents API 経由で push

### Workers API

`workers/` 配下に Cloudflare Workers (`hikari-dev-cms`) がある。カスタムドメイン `cms-api.hikari-dev.com` でデプロイ済み (`workers/wrangler.toml` の `[[routes]]` で設定)。Cloudflare Access で `/admin/*` と `cms-api.hikari-dev.com/api/*` を保護する。

`api.hikari-dev.com` は別サービス (AWS API Gateway、`/comment` コメント機能用) が使用しているドメインであり、この Workers プロジェクトとは無関係。混同しないこと。

#### エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/health` | ヘルスチェック (認証不要) |
| GET | `/public/whois?domain=...` | WHOIS 情報取得 (認証不要、`/whois` ミニアプリ用) |
| GET | `/api/articles?lang={ja\|en\|zh-TW}` | 記事一覧 |
| GET | `/api/articles/{filename}?lang=...` | 個別取得 |
| POST | `/api/articles` | 作成 (body: `{lang, date, slug, title, ...}`) |
| PUT | `/api/articles/{filename}?lang=...` | 更新 (sha 必須) |
| DELETE | `/api/articles/{filename}?lang=...&sha=...` | 削除 |
| POST | `/api/images?date=...&slug=...&filename=...` | 画像アップロード (body: 生バイナリ) |

`filename` は `{date}-{slug}` (拡張子なし、例: `2026-05-27-foo`)。

#### 保存パス (Docusaurus 規約)

- ja: `blog/{date}-{slug}.md`
- en: `i18n/en/docusaurus-plugin-content-blog/{date}-{slug}.md`
- zh-TW: `i18n/zh-TW/docusaurus-plugin-content-blog/{date}-{slug}.md`
- 画像: `static/img/blog/{date}-{slug}/{filename}` (URL は `/img/blog/{date}-{slug}/{filename}`)

#### 環境変数 (`workers/wrangler.toml` および `workers/.dev.vars`)

| 変数 | 種別 | 説明 |
|---|---|---|
| `GITHUB_TOKEN` | Secret | GitHub PAT or App (contents:write) |
| `GITHUB_OWNER` | Var | リポジトリオーナー (例: `himeyama`) |
| `GITHUB_REPO` | Var | リポジトリ名 (例: `www.hikari-dev.com`) |
| `GITHUB_BRANCH` | Var | コミット先ブランチ (例: `docusaurus`) |
| `ALLOWED_ORIGINS` | Var | CORS 許可オリジン (カンマ区切り) |
| `CF_ACCESS_TEAM_DOMAIN` | Var | Cloudflare Access チームドメイン |
| `CF_ACCESS_AUD` | Var | Cloudflare Access Audience Tag |

シークレットは `wrangler secret put GITHUB_TOKEN` で登録する。

### デプロイ手順

1. **GitHub PAT を発行** — `contents:write` 権限付きで本リポジトリへの書き込みを許可
2. **Cloudflare Access** で `/admin/*` と Workers のドメインを保護 (Audience Tag を控える)
3. `workers/wrangler.toml` の vars を本番値に書き換える
4. `cd workers && wrangler secret put GITHUB_TOKEN` でシークレット登録
5. `cd workers && wrangler deploy` で Workers デプロイ
6. 管理画面側 (Cloudflare Pages) で `_routes.json` または `_redirects` を使い、`/api/*` を Workers の URL にプロキシする (もしくは `window.__ADMIN_API_URL__` をセットする `<script>` を出す)

### 開発コマンド

```sh
# 管理画面ローカル (Docusaurus 内 /admin)
pnpm start
# → http://localhost:3000/admin

# Workers ローカル (別ターミナル)
cd workers
echo 'GITHUB_TOKEN=ghp_xxxxx' > .dev.vars
pnpm dev
# → http://localhost:8787
```

ローカル開発時は Cloudflare Access が無いため、`workers/src/middleware/auth.ts` の認証をスキップする条件分岐を一時的に入れるか、`/api/*` を直接叩く前提で構成すること。

### AI 機能 (OpenAI)

- OpenAI API キーはブラウザの localStorage に保存される (サーバーには送信しない)
- ツールバーの「設定」ボタンから API キーを設定
- モデル: `gpt-5-nano` / `gpt-5-mini` / `gpt-5` から選択
- 翻訳結果は別ファイルとして言語別パスに保存される
- 既存 ja 記事と同じ slug/date でしか翻訳記事を作成できない (ファイル名整合性のため)

