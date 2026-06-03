---
title: "Coreutils for Windows のまとめ"
authors: hikari
tags: [Windows]
---

## WinGetでインストールできるMicrosoft公式Linuxコマンド群の最新動向（2026年6月更新）

2026年6月、Microsoftは **Coreutils for Windows** を正式に公開した。

```powershell
winget install Microsoft.Coreutils
```

このコマンドでインストールできる **Microsoft.Coreutils** は、LinuxやmacOSで日常的に利用される `ls`、`cp`、`rm`、`cat` などのUNIX系コマンドを、Windows上でネイティブ実行できるようにするMicrosoft公式プロジェクトである。

本記事では、プロジェクトの概要、対応コマンド、制限事項、WSLやPowerShell との違いを整理する。

# 概要

Microsoft.Coreutilsは、MicrosoftがメンテナンスするWindows向けのコマンドラインツール群である。

内部的には、

* uutils/coreutils
* findutils
* grep

をベースに構築されており、Rust で実装されている。

Microsoft はこのプロジェクトの目的を、

> Linux、macOS、WSL、コンテナ、Windowsを行き来する開発者の摩擦を減らすこと

と説明。

# インストール方法

WinGet から簡単に導入可能である。

```powershell
winget install Microsoft.Coreutils
```

WinGetはWindows標準のパッケージマネージャーであり、指定したパッケージを自動的にダウンロード・インストール可能。

インストール後は通常のコマンドとして利用可能。

```powershell
ls
cat file.txt
grep keyword log.txt
cp source.txt backup.txt
```

# 利用できる主なコマンド

代表的なコマンドは以下の通り。

| 分類       | コマンド例      |
| -------- | ---------- |
| ファイル一覧   | ls         |
| ファイルコピー  | cp         |
| ファイル移動   | mv         |
| ファイル削除   | rm         |
| 内容表示     | cat        |
| 作業ディレクトリ | pwd        |
| ディレクトリ作成 | mkdir      |
| スリープ     | sleep      |
| パイプ処理    | tee        |
| 検索       | grep, find |

Linux利用者であれば見慣れたコマンドがそのまま利用可。

# PowerShellとの衝突問題

ここが最大の注意点！

PowerShell には既に同名のエイリアスや組み込みコマンドが存在する。

例:

| コマンド | 問題                 |
| ---- | ------------------ |
| ls   | PowerShellエイリアスと衝突 |
| cp   | Copy-Itemと衝突       |
| cat  | Get-Contentと衝突     |
| rm   | Remove-Itemと衝突     |
| pwd  | Get-Locationと衝突    |

そのため、

```powershell
ls
```

を実行しても、必ずしも Coreutils 版が呼ばれるわけではない。

Microsoft は PowerShell 7.4 以降の利用を推奨している。

# Windows特有の制約

Linux 互換を目指しているものの、Windowsの仕組みによる制限が存在する。

## 1. POSIX シグナルがない

Linuxの

```bash
kill
SIGTERM
SIGKILL
```

の仕組みはWindowsに存在しない。

そのため、

```bash
kill
timeout
```

は現時点で提供されない。

## 2. /dev/null が存在しない

Linux:

```bash
grep error log.txt > /dev/null
```

Windows:

```cmd
grep error log.txt > NUL
```

となる。

## 3. ACLとPOSIX権限の違い

Windows は ACL ベースの権限管理である。

そのため、

```bash
chmod
chown
chgrp
```

などのコマンドは提供されない。

---

## 4. シンボリックリンク作成

読み取りは可能だが、新規作成には

* Developer Mode
* 管理者権限

が必要である。

# 提供されない主なコマンド

Microsoft は一部コマンドを意図的に除外している。

### Windows と衝突するもの

* dir
* more
* paste
* whoami
* expand

### POSIX 依存が強いもの

* chmod
* chown
* chgrp
* chroot
* nohup
* stty
* tty
* who

### 現時点で未実装なもの

* kill
* timeout
* dd

# WSLとの違い

よく比較されるのが WSL（Windows Subsystem for Linux）である。

| 項目          | Microsoft.Coreutils | WSL          |
| ----------- | ------------------- | ------------ |
| 導入コスト       | 非常に低い               | Linux環境構築が必要 |
| 起動速度        | ネイティブ               | 仮想環境層あり      |
| Linux互換性    | 一部                  | 非常に高い        |
| Bash環境      | なし                  | あり           |
| apt利用       | 不可                  | 可能           |
| シェルスクリプト互換性 | 限定的                 | 高い           |

WSL は「Linux 環境そのもの」だが、Coreutils は「Windows 上で Linux 風コマンドを使うためのツール集」である。

