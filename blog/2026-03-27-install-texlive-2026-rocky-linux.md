---
title: Linux に TeX Live 2026 をインストールする
authors: hikari
tags: [Linux, TeX, LaTeX]
image: /img/ogp/2026-03-27-install-texlive-2026-rocky-linux.webp
---

Linux (RHEL 系) に ISO イメージを使って TeX Live 2026 をインストールする手順をまとめた。RHEL 系全般に適用できる。

{/* truncate */}

## 前提条件

- `sudo` 権限があること
- ディスク空き容量が 10 GB 以上あること（ISO 約 6.4 GB + インストール先 約 8 GB）
- インターネット接続があること

## Step 1: ISO イメージのダウンロード

理化学研究所のミラーサイトから ISO をダウンロードする。

```bash
cd
curl -C - -O --progress-bar https://ftp.riken.jp/CTAN/systems/texlive/Images/texlive2026.iso
```

`-C -` はダウンロードが途中で止まった場合の再開オプションである。

ダウンロード完了後、ファイルサイズを確認する (約 6.4 GiB):

```bash
ls -lh ~/texlive2026.iso
```

## Step 2: ISO イメージのマウント

マウントポイントを作成し、ISO をループ デバイスとしてマウントする。

```bash
sudo mkdir -p /mnt/texlive
sudo mount -o loop,ro ~/texlive2026.iso /mnt/texlive
```

マウント確認:

```bash
ls /mnt/texlive
```

以下のようなファイルが表示されれば成功である：

```
install-tl  archive  tlpkg  README  ...
```

## Step 3: インストーラーの実行

```bash
sudo /mnt/texlive/install-tl
```

テキスト UI のインタラクティブ メニューが起動する。

### 主な操作キー

| キー | 操作 |
|---|---|
| `S` | インストール スキームの選択 |
| `D` | インストール先ディレクトリの変更 |
| `I` | インストール開始 |
| `Q` | 終了（キャンセル） |

### 推奨設定

- **スキーム**: `scheme-full`（全パッケージ。日本語 LaTeX に必要な `collection-langjapanese` が含まれる）
- **インストール先**: `/usr/local/texlive/2026`（デフォルト）

設定確認後、`I` を入力してインストールを開始する。インストールには数十分かかる。

## Step 4: PATH の設定

`~/.bashrc` に TeX Live のバイナリ パスを追加する。

```bash
echo 'export PATH="/usr/local/texlive/2026/bin/x86_64-linux:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 5: ロケールの修正 (RHEL 系)

RHEL 系 Linux では locale が未設定の場合、`lualatex` 実行時にエラーが発生する。以下を実行する。

```bash
sudo dnf install -y glibc-langpack-en
```

また、シェル起動時に locale を設定する：

```bash
echo 'export LANG=C.UTF-8' >> ~/.bashrc
source ~/.bashrc
```

## Step 6: 動作確認

各コマンドのバージョンを確認する:

```bash
tex --version
lualatex --version
platex --version
```

期待される出力例:

```
TeX 3.141592653 (TeX Live 2026)
LuaHBTeX, Version 1.24.0 (TeX Live 2026)
e-upTeX 3.141592653-p4.1.2-u2.02 (TeX Live 2026)
```

## Step 7: 日本語コンパイルのテスト

テスト ファイルを作成する:

```bash
cat > /tmp/test.tex << 'EOF'
\documentclass{jlreq}
\begin{document}
日本語のテスト。TeX Live 2026 による日本語組版のサンプルです。
\end{document}
EOF
```

コンパイルする:

```bash
cd /tmp && lualatex test.tex
```

`test.pdf` が生成されれば成功である。

## Step 8: 後片付け（任意）

インストール完了後、ISO とマウントポイントを削除できる:

```bash
sudo umount /mnt/texlive
rm ~/texlive2026.iso
```

## ミラーサイト一覧

ダウンロードが遅い場合は他のミラーを試す:

| ミラー | URL |
|---|---|
| 理化学研究所（推奨） | https://ftp.riken.jp/CTAN/systems/texlive/Images/ |
| JAIST | https://ftp.jaist.ac.jp/pub/CTAN/systems/texlive/Images/ |
| 山形大学 | https://ftp.yz.yamagata-u.ac.jp/pub/CTAN/systems/texlive/Images/ |
| CTAN ミラー | https://mirror.ctan.org/systems/texlive/Images/ |
