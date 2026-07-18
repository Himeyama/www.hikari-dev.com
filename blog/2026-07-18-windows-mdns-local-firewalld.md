---
title: Windows から同一 LAN 上の Linux 機に hostname.local でアクセスできない問題を解決する
authors: hikari
tags: [Linux, Windows, ネットワーク, Fedora]
image: /img/ogp/2026-07-18-windows-mdns-local-firewalld.webp
---

同一 LAN 上の Fedora Server に `myhost.local` (mDNS) でアクセスしようとしたところ名前解決だけが失敗する現象に遭遇した。tcpdump でパケットを直接観測して切り分けたところ、原因は firewalld が mDNS の着信をブロックしていたことだった。

{/* truncate */}

## 環境

- クライアント: Windows 11
- サーバー: Fedora Server (Linux)
- 両者は同一 LAN 上 (例: Windows 機 `192.0.2.10`、Linux 機 `192.0.2.20`)
- Linux 機側で Web サーバーがポート 3000 で稼働

## やりたかったこと

IP アドレス直打ちではなく、mDNS (Avahi) を使って次の形式でアクセスしたい。

```
http://myhost.local:3000
```

## 下準備: Linux 機に Avahi をインストールする

Fedora Server には標準で Avahi が入っていない場合があるため、まずインストールする。

```bash
sudo dnf install avahi
sudo systemctl enable --now avahi-daemon
```

起動後、`journalctl -u avahi-daemon` で以下のようなログが出ていればホスト名の公開自体は行われている。

```
Registering new address record for 192.0.2.20 on eth0.IPv4.
```

この時点でも、後述の通り firewalld の設定が別途必要になる。

## 症状

- `http://192.0.2.20:3000` → アクセス可能 (Web サーバー、ポート開放、IP 通信すべて正常)
- `ping myhost.local` → 「ホストが見つかりません」
- `nslookup myhost.local` → 存在しないドメイン
- Linux 機側の avahi-daemon は起動しており、ホスト名の広告ログも出ている (上記の通り)
- Linux 機側の firewalld には `3000/tcp` など必要なポートは開放済み

一見すると Linux 機側も Windows 側も正常に見えるのに、名前解決だけが失敗する状態だった。

## 切り分けの手順

### 1. Windows 側の mDNS クライアントは動いているか

```powershell
netstat -ano -p udp | findstr 5353
```

Windows の Dnscache サービス (DNS クライアント) が UDP 5353 を待受していることを確認した。Windows 10 (1703 以降) / 11 には標準で mDNS クライアント機能が組み込まれている。

:::note 余談
「Raspberry Pi は何もしなくても `raspberrypi.local` で見えるのに、なぜ Fedora は見えないのか」という疑問が浮かぶかもしれない。理由は単純で、Raspberry Pi OS には最初から Avahi がプリインストールされ、かつデフォルトのファイアウォール設定 (そもそも `iptables` / `nftables` によるフィルタリングが初期状態でほぼ無効) で mDNS の通信がブロックされていないためである。一方、Fedora Server は Avahi 自体が未インストールな上に、firewalld がデフォルトで必要最小限のポートしか開けない設計になっている。つまり「Windows 側の対応状況」の違いではなく、「Linux 側のディストリビューションごとの初期設定の厳しさ」の違いが原因である。
:::

### 2. Linux 機側の Avahi は待受しているか

```bash
sudo ss -lunp | grep 5353
```

```
UNCONN 0 0 0.0.0.0:5353  users:(("avahi-daemon",...))
UNCONN 0 0    [::]:5353  users:(("avahi-daemon",...))
```

IPv4 / IPv6 両方で正常に待受していることを確認した。

### 3. 実際にパケットが届いているか (ここが本質)

Linux 機側で tcpdump を仕込み、Windows 側から名前解決を試みてキャプチャする。

```bash
sudo tcpdump -ni eth0 port 5353
```

```powershell
Resolve-DnsName -Name myhost.local
```

:::note 注意
単純な `ping myhost.local` コマンドは実装上 mDNS クエリを送出しないケースがあった。`Resolve-DnsName` (DNS クライアント API 経由) を使うと確実に mDNS クエリが送出される。ping 単体で「見つかりません」と出ても、mDNS 自体が機能していないとは断定できない。
:::

キャプチャ結果は以下の通り。

```
192.0.2.10.mdns > 224.0.0.251.mdns: A (QM)? myhost.local.
```

Windows 側からのクエリは Linux 機に届いていた。しかし、それに対する Avahi からの応答パケットが一切キャプチャされなかった。

ここで、ネットワーク経路と Windows 側のクライアント機能は無罪と判断できる。問題は Linux 機側でクエリが握りつぶされていることに絞り込めた。

## 根本原因

Linux 機側の firewalld の許可リストを確認する。

```bash
sudo firewall-cmd --list-all
```

```
services: cockpit dhcpv6-client ssh
ports: 3000/tcp 4321/tcp 5173/tcp ...
```

UDP 5353 (mDNS) がどこにも許可されていなかった。

Avahi 自身が発信するマルチキャスト広告パケット (アウトバウンド) は問題なく観測できていたため一見正常に見えたが、外部から着信する mDNS クエリ (インバウンド) は firewalld でブロックされ、avahi-daemon まで到達していなかったのである。mDNS は応答が来なくても静かにタイムアウトする仕様のため、エラーメッセージからは原因が全く分からなかった。

## 対処

firewalld の定義済みサービス `mdns` を追加する。

```bash
# 動作確認 (ランタイムのみ、再起動で消える)
sudo firewall-cmd --zone=<ゾーン名> --add-service=mdns

# 恒久化
sudo firewall-cmd --zone=<ゾーン名> --add-service=mdns --permanent
```

`mdns` サービス定義の中身は以下の通りで、宛先をマルチキャストアドレスに限定した安全な許可になっている。

```
mdns
  ports: 5353/udp
  destination: ipv4:224.0.0.251 ipv6:ff02::fb
```

適用後、即座に解決した。

```powershell
Resolve-DnsName myhost.local
# → 192.0.2.20 が返る

ping myhost.local
# → 応答あり

curl http://myhost.local:3000
# → 200 OK
```

## まとめ

1. 「マルチキャストパケットを自分から送れている」ことと「マルチキャストパケットを受け取れている」ことは別問題である。ファイアウォールはアウトバウンドとインバウンドで挙動が非対称なので、片方が動いているからといってもう片方も動いているとは限らない。
2. ping コマンド単体で mDNS の疎通を判断すべきではない。Windows では Resolve-DnsName を使うほうが、実際にどんな名前解決クエリが飛んでいるか確実に確認できる。
3. tcpdump での実パケットキャプチャが最短の切り分け手段である。ログやサービスステータスがどれだけ正常に見えても、「クエリが届いているか」「応答が返っているか」を両側で直接見るのが一番早い。
4. firewalld でサービスを追加する際は mdns のような宛先 (destination) がマルチキャストアドレスに限定された定義済みサービスを使うと、必要以上に穴を開けずに済む。
5. Avahi は「インストールして起動しただけ」では不十分である。ディストリビューションによってはファイアウォールがデフォルトで有効かつ厳格なため (Fedora の firewalld はその代表例) 、Avahi 自体の設定が正しくても、firewalld 側の許可を別途行わない限り mDNS は機能しない。Raspberry Pi OS のようにファイアウォールが緩い / 無効なディストリビューションとの違いはここにある。
