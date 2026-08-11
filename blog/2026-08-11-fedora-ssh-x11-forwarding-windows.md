---
title: Fedora から Windows へ、SSH で GUI アプリを表示する
authors: hikari
tags: [Linux, Windows, Fedora, SSH, ネットワーク]
image: /img/ogp/2026-08-11-fedora-ssh-x11-forwarding-windows.webp
---

Fedora 43 Server は、X サーバもデスクトップ環境も入っていなかった。ここから Windows 機に GUI アプリを表示させたい。デスクトップ環境は入れずに、SSH X11 転送でアプリを転送した備忘録。

{/* truncate */}

## 最初に潰しておくべき誤解: GNOME Shell は X11 転送できない

「GNOME を入れて SSH で飛ばす」と考えたとき、素直にやると `dnf group install gnome-desktop` に手が伸びる。しかしここには前提の取り違えがある。

**GNOME Shell は Wayland コンポジタであり、SSH の X11 転送では飛ばせない。** X11 転送で運べるのは X11 クライアントとして動く「個別のアプリケーション」だけで、デスクトップ環境そのものではない。

つまり目的によって構成が完全に分岐する。

| やりたいこと | 使う技術 | サーバ側に必要なもの |
|---|---|---|
| 個別の GUI アプリを飛ばす | SSH X11 転送 | GUI **アプリ**のみ (X サーバ不要) |
| デスクトップ全体を使う | xrdp + RDP | GNOME フル + Xorg + xrdp |

今回は前者。**X サーバは Windows 側で動く**ので、Fedora 側に `Xorg` (`@base-x`) も `gnome-shell` も `gdm` も要らない。サーバーに常駐サービスを増やさずに済む、というのがこの構成の一番の利点だった。

## 環境

- Fedora Linux 43 (Server Edition) / `systemctl get-default` = `multi-user.target`
- SELinux Enforcing
- クライアントは同一 LAN 上の Windows 機

### 既に揃っていたもの (作業不要だった)

事前に確認したところ、Fedora Server の素の状態で以下が揃っていた。ここを先に洗い出すと作業量が読める。

| 前提 | 状態 |
|---|---|
| `xorg-x11-xauth` | 導入済み (X11 転送の必須要件) |
| 日本語フォント (Noto CJK, `langpacks-fonts-ja`) | 導入済み |
| `dbus-broker` + ユーザセッションバス `/run/user/1000/bus` | 稼働中 (GNOME アプリの起動に必要) |
| `mesa-libGL` / `mesa-dri-drivers` | 導入済み |

特に `xorg-x11-xauth` が最初から入っているのは大きい。これが無いと X11 転送の認証クッキーが配れず、`ssh -X` しても `DISPLAY` が設定されない。

## Step 1: sshd の X11 転送設定を確認する

まず現在の実効値を見る。設定ファイルを読むのではなく `sshd -T` で「実際に効いている値」を確認するのが確実 (root 権限が要る)。

```bash
sudo sshd -T | grep -iE 'x11|allowtcpforwarding'
```

結果:

```
x11displayoffset 10
x11maxdisplays 1000
x11forwarding yes
x11uselocalhost yes
allowtcpforwarding yes
```

**Fedora 43 は既定で `x11forwarding yes`** だった。よってこのステップは変更不要。`x11uselocalhost yes` もループバックのみで待ち受ける安全側の設定なので、そのままでよい。

もし `x11forwarding no` だった場合は、`/etc/ssh/sshd_config` 本体を触らずドロップインを置く (Fedora の sshd_config は冒頭で `Include /etc/ssh/sshd_config.d/*.conf` している)。

```bash
sudo tee /etc/ssh/sshd_config.d/10-x11-forwarding.conf >/dev/null <<'EOF'
X11Forwarding yes
X11UseLocalhost yes
X11DisplayOffset 10
EOF

sudo sshd -t && sudo systemctl reload sshd
```

:::note
ファイアウォールと SELinux の変更は不要。X11 転送は 22 番ポート内をトンネルするだけで新規ポートを開かないし、標準の `sshd_t` ポリシーで許可されている。
:::

## Step 2: GUI アプリと切り分け用ツールを入れる

```bash
sudo dnf install nautilus gnome-text-editor gnome-system-monitor loupe xterm xeyes xdpyinfo
```

- `nautilus` — ファイルマネージャー
- `gnome-text-editor` — 標準テキストエディタ
- `gnome-system-monitor` — システムモニター
- `loupe` — 画像ビューアー (Fedora 43 の標準。`eog` は旧世代)
- `xterm` / `xeyes` / `xdpyinfo` — 疎通確認用

### 注意: Fedora 43 では `xorg-x11-apps` が分割されている

X11 転送の動作確認といえば `xeyes` だが、**Fedora 43 に `xorg-x11-apps` というパッケージはもう無い**。`xeyes` / `xdpyinfo` はそれぞれ単体パッケージに分割済みなので、個別に指定する。

```
xeyes-1.3.0-6.fc43.x86_64    : A follow the mouse X demo
xdpyinfo-1.3.4-3.fc43.x86_64 : X11 display information utility
```

これらは GNOME アプリより依存が浅いので、「X 転送自体が壊れているのか、GNOME アプリ側の問題なのか」を切り分けるのに効く。

実測では 44 パッケージ / 125 MiB 程度のインストールで済んだ。デスクトップ環境を入れないので、この程度で済む。GTK4 や glib 系が既に入っていたことも効いている。

## Step 3: Windows 側に X サーバーを立てる

**VcXsrv** を使う。`XLaunch` の設定は以下。

- Display settings: **Multiple windows** (アプリごとに独立したウィンドウになる)
- Display number: **0**
- Client startup: **Start no client**
- Extra settings: **Clipboard** と **Primary Selection** をオン、**Native opengl** は**オフ**
- "Disable access control" はまずオフのまま試す
- ファイアウォールのダイアログは **プライベートネットワークのみ**許可

`Native opengl` をオフにするのがポイント。オンだと GNOME アプリが GLX 周りで落ちやすい。

設定は `config.xlaunch` として保存しておくと次回からワンクリックで起動できる。

次に、Windows の OpenSSH クライアントに X サーバーの場所を教える。

```powershell
setx DISPLAY "localhost:0.0"
```

`setx` は既存のセッションには反映されないので、**ターミナルを開き直す**こと。

## Step 4: SSH クライアント側の設定

`%USERPROFILE%\.ssh\config` に書いておくと毎回オプションを付けずに済む。

```
Host fedora
    HostName 192.0.2.20
    User hikari
    ForwardX11 yes
    ForwardX11Trusted yes
```

### `ForwardX11Trusted yes` を付けている理由

Windows の OpenSSH クライアントには **`xauth` が同梱されていない**。このため非 trusted な `-X` では認証クッキーの生成に失敗し、GUI が出ないことがある。`-Y` 相当の trusted 転送にすると回避できる。

ただし trusted 転送は、転送先のアプリがローカルの X サーバーに対して制限なくアクセスできる (他ウィンドウのキー入力を覗ける) 状態になる。LAN 内の自分の VM が相手だから許容しているのであって、**信頼できないホストには使わないこと**。

## Step 5: 疎通確認

XLaunch を起動した状態で `ssh fedora` し、依存の浅いものから順に確認していく。この順番が切り分けそのものになっている。

```bash
# 1. DISPLAY が自動設定されているか (localhost:10.0 のような値になる)
echo $DISPLAY

# 2. 認証クッキーが配られているか ($DISPLAY と同じ番号の行があること)
xauth list

# 3. X サーバーに到達できているか
xdpyinfo | head -20

# 4. 描画確認 — Windows 上にウィンドウが出れば転送成功
xeyes
xterm

# 5. GNOME アプリの確認
gnome-text-editor
nautilus
gnome-system-monitor
```

`DISPLAY` が `localhost:10.0` になるのは、sshd の `X11DisplayOffset 10` によるもの。サーバー側の `:10` がトンネルを通って Windows 側の `:0` に届く、という二段構えになっている。

### 切り分け表

| 症状 | 原因 |
|---|---|
| `echo $DISPLAY` が空 | sshd 側の設定か、Windows 側の `DISPLAY` 環境変数が未反映 |
| `xdpyinfo` が `unable to open display` | Windows 側の X サーバー未起動、またはファイアウォールでブロック |
| `xeyes` は出るが GNOME アプリが出ない | D-Bus かフォントの問題。前面実行してエラー出力を見る |
| `Authorization required, but no authorization protocol specified` | XLaunch を「Disable access control」オンで起動し直す |
| 日本語が豆腐 (□) になる | `fc-list :lang=ja \| head` でフォントを確認 |

## サーバーへの影響を確認する

導入後に余計なものが増えていないか確認した。

依存に **`wsdd`** (Windows ネットワーク探索デーモン、gvfs の SMB 連携由来) が含まれていたのが気になったが、

```bash
systemctl is-enabled wsdd   # → disabled
systemctl is-active wsdd    # → inactive
```

既定で無効だったため対処不要。常駐サービスと待受ポートも確認したが、

- 新規に起動した常駐サービス: **なし**
- 新規の待受ポート: **なし** (22 / 6443 / 53 等、従来どおり)

`systemctl get-default` も `multi-user.target` のまま。デスクトップ環境を入れない構成の狙いどおりに収まった。

## 既知の制約

- **`gnome-terminal` / `ptyxis` は避ける。** これらは D-Bus アクティベーションで単一のサーバープロセス (`*-server`) を共有する設計のため、最初の起動時の `DISPLAY` に固定される。SSH を張り直すと新しい `DISPLAY` に追従せず、ウィンドウが出ないことがある。転送先のターミナルには **`xterm` を使う**のが確実。
- **描画性能。** LAN 内なら軽量アプリは実用的だが、スクロールや動画は遅い。なお `ssh -C` (圧縮) は LAN では逆効果になりやすいので付けない。
- **3D/GL。** ハードウェア支援は効かず、間接 GLX かソフトウェアレンダリングになる。GL を使うアプリが落ちる場合は `LIBGL_ALWAYS_INDIRECT=1` を試す。

## まとめ

- **GNOME Shell は X11 転送できない。** 飛ばせるのは個別アプリだけ。ここを最初に理解しておかないとデスクトップ環境を無駄に導入することになる。
- X サーバーは Windows 側で動くので、**サーバー側に Xorg もデスクトップ環境も要らない**。今回は 44 パッケージ / 125 MiB で済み、常駐サービスも待受ポートも増えなかった。
- **Fedora 43 の sshd は既定で X11 転送が有効。** まず `sudo sshd -T | grep -i x11` で実効値を確認すれば、無駄な設定変更をせずに済む。
- Fedora 43 では **`xorg-x11-apps` が単体パッケージに分割**されている。`xeyes` / `xdpyinfo` は個別に指定する。
- Windows の OpenSSH には `xauth` が無いため、**`ForwardX11Trusted yes`** が実質必要になる。信頼できる相手に限って使うこと。

デスクトップ全体が欲しくなったら、`xrdp` + `xorgxrdp` + GNOME を入れて Windows 標準のリモートデスクトップで繋ぐ構成に切り替える。その場合は firewalld で 3389/tcp の開放が別途必要になる。

`xeyes` は表示できても `nautilus` だけがどうしても起動しないケースがあった。その切り分けは [続編](/blog/2026/08/11/fedora-nautilus-x11-crash) にまとめた。
