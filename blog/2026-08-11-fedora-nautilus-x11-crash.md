---
title: SSH X11 転送で GUI アプリが起動しない
authors: hikari
tags: [Linux, Windows, Fedora, SSH, ネットワーク]
image: /img/ogp/2026-08-11-fedora-nautilus-x11-crash.webp
---

[前回](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows)の手順で SSH X11 転送環境を組み、`xeyes` は無事 Windows 側に表示された。ところが `nautilus` がどうしても起動しない。`DISPLAY` は通っているのに、なぜこのアプリだけ落ちるのかを切り分けた記録。

{/* truncate */}

## 症状

```
$ nautilus
** Message: 23:27:59.343: Connecting to org.freedesktop.Tracker3.Miner.Files
nautilus-application-Message: 23:27:59.344: Failed to initialize display server connection: Unsupported or missing session type 'tty'
libEGL warning: DRI3 error: Could not get DRI3 device
libEGL warning: Ensure your X server supports DRI3 to get accelerated rendering
Couldn't open libGLESv2.so.2: 共有オブジェクトファイルを開けません: そのようなファイルやディレクトリはありません
中止 (コアダンプ)
```

一方、`xeyes` は同じシェルから何の設定変更もなく問題なく Windows 側に表示された。X11 転送そのものは生きていることは確定しているのに、GNOME アプリだけ拒否される状態。

## 原因① : xeyes と nautilus は要求している水準が違う

`xclock` / `xlogo` / `xeyes` は古典的な Xlib アプリで、必要なのは `DISPLAY` 変数と X サーバへの TCP 接続だけ。これだけで動く。

対して `nautilus` は GNOME の一部である現代的な GTK アプリで、単純な X11 接続以上のものを要求してくる。

| 確認内容 | 何をチェックしているか |
|---|---|
| セッションタイプ | `systemd-logind` に「グラフィカルセッション」として登録されているか |
| D-Bus / Tracker3 | ファイル検索インデックスサービスとの連携 (ログ冒頭の `Connecting to org.freedesktop.Tracker3.Miner.Files`) |
| EGL/GLES | 描画に使う GPU アクセラレーション基盤 |

エラーメッセージの `Unsupported or missing session type 'tty'` がまさにこれで、SSH の X11 転送 (`ssh -X` 相当) は `DISPLAY` こそ使えるものの、`loginctl` 上は依然として「tty セッション」のままであり、正式なグラフィカルセッション (x11/wayland) として認識されない。そのため nautilus はここで起動を拒否していた。

### 対処: セッションタイプを環境変数で回避する

`systemd-logind` の設定自体 (PAM 側) をいじるのは影響範囲が大きいため、まずは軽量な回避策から試した。

```bash
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11 nautilus
```

これで `Unsupported or missing session type 'tty'` のエラーは解消した。GTK 側がまず環境変数を見てから logind に問い合わせる実装だったため、環境変数だけで通った形になる。

## 原因② : libGLESv2.so.2 がシステムに存在しない

セッションチェックを回避しても、プロセスは exit code 134 (SIGABRT、コアダンプ) で落ち続けた。ログに残る決定的な一行がこれ。

```
Couldn't open libGLESv2.so.2: 共有オブジェクトファイルを開けません: そのようなファイルやディレクトリはありません
```

`LIBGL_ALWAYS_SOFTWARE=1` でソフトウェアレンダリングを強制しても改善しなかった。これは「GPU が使えない」という設定の問題ではなく、「ライブラリファイルそのものが存在しない」という導入の問題だったため、レンダリングモードをいくら切り替えても無意味だった。

### 切り分け: どのパッケージが持っているか

```bash
$ dnf provides '*/libGLESv2.so.2'
libglvnd-gles-1:1.7.0-8.fc43.x86_64 : GLES support for libglvnd
Repo         : fedora
Matched From :
Filename     : /usr/lib64/libGLESv2.so.2
```

[前回の記事](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows)で `mesa-libGL` は導入済みと確認していたが、`libglvnd-gles` (GLES 対応レイヤー) は別パッケージであり、これが未導入だった。Fedora 43 では GL 系のパッケージがこのように細かく分割されているため、「mesa 系は入れたはずなのに」という思い込みで見落としやすい。

```bash
sudo dnf install -y libglvnd-gles
```

## 結果

```bash
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11 nautilus
```

コアダンプせずにプロセスが継続稼働し、Windows 側にウィンドウが表示された。残るログは以下の警告のみで、これは致命的ではない。

```
libEGL warning: DRI3 error: Could not get DRI3 device
libEGL warning: Ensure your X server supports DRI3 to get accelerated rendering
```

GPU アクセラレーションが効かずソフトウェアレンダリングにフォールバックしているため、動作はもっさりしているが、実用上は問題なく操作できる。

## 切り分け表 (追加分)

| 症状 | 原因 | 対処 |
|---|---|---|
| `xeyes` は表示されるが GNOME アプリだけ `Unsupported or missing session type 'tty'` | SSH の tty セッションが logind 上でグラフィカルセッションと認識されていない | `XDG_SESSION_TYPE=x11 GDK_BACKEND=x11` を付けて起動 |
| セッションエラーは消えたが「中止 (コアダンプ)」で落ちる | `Couldn't open libGLESv2.so.2` = ライブラリ自体が未導入 | `dnf provides '*/libGLESv2.so.2'` で提供パッケージを特定し導入 (`libglvnd-gles`) |
| `LIBGL_ALWAYS_SOFTWARE=1` を付けても改善しない | ドライバ選択の問題ではなく、ライブラリファイル欠如が原因のため無関係 | レンダリングモードではなくパッケージ導入で対処 |

## まとめ

- `xeyes` が映る ≠ GNOME アプリが動く。古典的な Xlib アプリと現代の GTK アプリでは要求する前提がまったく違う。X11 転送の疎通確認と GNOME アプリの動作確認は別の切り分けとして扱うべき。
- SSH の X11 転送は `DISPLAY` を通すだけで、`systemd-logind` 上のセッション種別までは変えてくれない。nautilus のようにセッションタイプを見るアプリは `XDG_SESSION_TYPE=x11 GDK_BACKEND=x11` の環境変数で通ることがある。
- 「ライブラリが見つからない」エラーは、レンダリングモードの切り替え (`LIBGL_ALWAYS_SOFTWARE` 等) では解決しない。`dnf provides '*/<ファイル名>'` で提供パッケージを特定し、素直に導入するのが早い。
- Fedora 43 は mesa 関連パッケージが細かく分割されている。`mesa-libGL` を入れていても `libglvnd-gles` (GLES 対応) は別途必要になるケースがある。
- 動いてはいるが、GPU アクセラレーションなしの X11 転送は描画が重い。快適さを求めるなら [前回の記事](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows)の末尾で触れた `xrdp` + フルデスクトップ構成への切り替えが選択肢になる。
