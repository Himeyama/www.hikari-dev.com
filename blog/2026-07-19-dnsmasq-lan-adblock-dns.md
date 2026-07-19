---
title: 自宅 LAN に dnsmasq で DNS キャッシュ + 広告ブロックサーバーを立てた話
authors: hikari
tags: [Linux, ネットワーク, Fedora, SELinux]
image: /img/ogp/2026-07-19-dnsmasq-lan-adblock-dns.webp
---

自宅の LAN 用に、名前解決を速くしつつ広告もブロックする DNS サーバーを立てた。上流は Cloudflare の `1.1.1.1`。Pi-hole を使わず、すでにインストール済みだった軽量な dnsmasq だけで完結させた記録である。SELinux にハマった話まで含めて残しておく。

{/* truncate */}

> IP・ホスト名は自分の環境に合わせて読み替えてほしい。
>
> | プレースホルダー | 意味 |
> |---|---|
> | `192.168.0.0/24` | 自宅 LAN のサブネット |
> | `192.168.0.10` | このサーバーの LAN IP |
> | `eth0` | サーバーの LAN インターフェース名 |

## なぜ作るのか

- 速度: よくアクセスするドメインをローカルにキャッシュすれば、2 回目以降の名前解決が一瞬になる。
- 広告ブロック: 広告・トラッカーのドメインを DNS レベルで潰せば、LAN 内の全端末 (スマホ含む) でアプリを入れずに広告が消える。
- 上流は 1.1.1.1: 速くてプライバシーにも配慮された定番リゾルバー。

## 構成の方針

| 項目 | 選択 | 理由 |
|---|---|---|
| ソフト | dnsmasq | すでに導入済みで軽量。キャッシュ・転送・hosts 形式ブロックを 1 本でこなす |
| 上流 | `1.1.1.1` / `1.0.0.1` (平文 UDP 53) | 最小構成でシンプルに。暗号化 (DoT) は今回見送り |
| ブロックリスト | [StevenBlack unified hosts](https://github.com/StevenBlack/hosts) | 定番。`0.0.0.0 domain` 形式で約 8 万ドメイン |
| 公開範囲 | LAN 限定 | ファイアウォールで送信元をサブネットに絞る (オープンリゾルバー化を防ぐ) |

環境は Fedora Server + SELinux Enforcing。ホスト側の DNS 設定 (`systemd-resolved`) には一切触らず、dnsmasq を純粋に「LAN 向けサービス」として独立させる方針にした。

## ポイント1: systemd-resolved と 53 番ポートを取り合わない

Fedora では `systemd-resolved` が `127.0.0.53` で 53 番を掴んでいる。dnsmasq が `0.0.0.0:53` (全インターフェース) で待ち受けようとすると衝突して起動に失敗する。

そこで待ち受けを LAN IP と loopback に限定し、`bind-dynamic` で個別バインドさせる。

```conf
# /etc/dnsmasq.d/adblock-cache.conf
interface=eth0
listen-address=127.0.0.1
bind-dynamic
```

これで `192.168.0.10:53` と `127.0.0.1:53` だけを掴み、`127.0.0.53` の resolved とは共存できる。

## dnsmasq の設定 (全体)

```conf
# 待ち受け (resolved と競合させない)
interface=eth0
listen-address=127.0.0.1
bind-dynamic

# 上流を 1.1.1.1 に固定 (/etc/resolv.conf は読まない)
no-resolv
server=1.1.1.1
server=1.0.0.1
server=2606:4700:4700::1111
server=2606:4700:4700::1001

# キャッシュ (高速化)
cache-size=10000
min-cache-ttl=60

# 挙動
domain-needed # ドット無しの名前を上流に投げない
bogus-priv # プライベート逆引きを外に漏らさない
no-hosts # ホストの /etc/hosts は読まない
addn-hosts=/etc/dnsmasq-blocklist.hosts # 広告ブロックリスト
```

広告ブロックの仕組みはシンプルで、StevenBlack の hosts ファイル (`0.0.0.0 ads.example.com` の羅列) を `addn-hosts` で読ませるだけである。
該当ドメインへの問い合わせに `0.0.0.0` を返すので、広告サーバーには繋がらなくなる。

## ハマりどころ1: `bad option at line 15`

最初、ブロックリストを `/etc/dnsmasq.d/blocklist.hosts` に置いたら、起動チェックでこんなものが。

```
dnsmasq: bad option at line 15 of /etc/dnsmasq.d/blocklist.hosts
```

原因は `dnsmasq.conf` のこの行だった。

```conf
conf-dir=/etc/dnsmasq.d,.rpmnew,.rpmsave,.rpmorig
```

`conf-dir` は指定ディレクトリ配下の全ファイルを設定ファイルとして読み込む (除外は拡張子指定のみ)。つまり hosts 形式のブロックリストまで「設定」として解釈され、`127.0.0.1 localhost` の行で文法エラーになっていた。

対処としてブロックリストを `/etc/dnsmasq.d/` の外 (`/etc/dnsmasq-blocklist.hosts`) に置く。`addn-hosts` でフルパス指定しているので場所はどこでもよい。

## ハマりどころ2: SELinux で `Permission denied`

場所を移して再起動した。今度は文法チェックは通ったが、ログにこれが出てブロックが効かない。

```
dnsmasq: failed to load names from /etc/dnsmasq-blocklist.hosts: 許可がありません
```

ファイルは `644 root:root` で誰でも読めるはずである。なのに Permission denied。犯人は SELinux だった。

セットアップスクリプトでは「一時ファイルに `curl` でダウンロードし `mv` で本番配置」としていた。この `mv` が曲者で、一時ファイルの SELinux ラベル `user_tmp_t` をそのまま引き継いでしまう。dnsmasq のプロセス (`dnsmasq_t`) は `user_tmp_t` のファイルを読めない。

```sh
$ ls -Z /etc/dnsmasq-blocklist.hosts
unconfined_u:object_r:user_tmp_t:s0   /etc/dnsmasq-blocklist.hosts   # これが原因
$ ls -Z /etc/dnsmasq.conf
system_u:object_r:dnsmasq_etc_t:s0    /etc/dnsmasq.conf              # 本来あるべき系統
```

対処: `restorecon` で正しいラベル (`etc_t`) に戻す。

```sh
$ sudo restorecon -Fv /etc/dnsmasq-blocklist.hosts
Relabeled /etc/dnsmasq-blocklist.hosts from unconfined_u:object_r:user_tmp_t:s0 to system_u:object_r:etc_t:s0
$ sudo systemctl restart dnsmasq
```

再起動後のログでは、今度こそ読めた。

```
dnsmasq: read /etc/dnsmasq-blocklist.hosts - 80886 names
```

> 教訓: SELinux 環境で `mv` を使うとラベルが付いてくる。`/etc` 配下に外部から持ってきたファイルを置いたら `restorecon` を打つのを習慣にする。自動更新スクリプトにも `restorecon` を組み込んでおいた。

## ファイアウォールは LAN 限定で

53 番を無条件に開けると、外から使えるオープンリゾルバーになってしまう (DDoS の踏み台リスク)。家庭内ルーター配下でインターネット直結ではないとはいえ、多層防御として送信元をサブネットに絞る。

```bash
firewall-cmd --permanent \
  --add-rich-rule='rule family=ipv4 source address=192.168.0.0/24 service name=dns accept'
firewall-cmd --reload
```

## 自動更新

ブロックリストは日々更新されるので、週 1 回自動で取り直すようにした。systemd のタイマー (`OnCalendar=weekly`) で更新スクリプトを叩き、取得成功時だけ `systemctl reload dnsmasq` する。失敗時は古いリストを維持する安全設計にしてある。

## 動作確認

```sh
# LAN IP で待ち受けているか
$ ss -tulnp | grep 192.168.0.10:53
udp  UNCONN  192.168.0.10:53
tcp  LISTEN  192.168.0.10:53

# 名前解決できる
$ dig @192.168.0.10 github.com +short
20.27.177.113

# キャッシュ効果 (2 回目は 0 msec)
$ dig @192.168.0.10 example.com | grep "Query time"
;; Query time: 27 msec
$ dig @192.168.0.10 example.com | grep "Query time"
;; Query time: 0 msec

# 広告ドメインはブロック (0.0.0.0 が返る)
$ dig @192.168.0.10 mediavisor.doubleclick.net +short
0.0.0.0
```

`example.com` の 2 回目は 27ms から 0ms になった。キャッシュがしっかり効いている。広告ドメインは狙いどおり `0.0.0.0` に落ちた。

> ちなみに `dig @192.168.0.10 doubleclick.net` (裸のドメイン) は普通に解決される。StevenBlack のリストは `mediavisor.doubleclick.net` のような具体的な広告サブドメインを潰す方針で、トップドメインそのものはブロックしない。

## LAN 端末側の設定

- ルーターの DHCP 配布 DNS を `192.168.0.10` に変更すれば、LAN 全体に一括適用できる (おすすめ)。
- 個別にやるなら各端末の DNS を手動で `192.168.0.10` にする。

## まとめ

- dnsmasq だけで「キャッシュ高速化 + 広告ブロック + LAN 公開」が実現できた。Pi-hole は不要だった。
- ハマったのは 2 箇所、どちらもディストリ固有の作法だった。
  1. `conf-dir` が配下を全部設定として読む → hosts はディレクトリ外に置く。
  2. SELinux で `mv` 由来のラベルが邪魔 → `restorecon` で復元する。
- 約 8 万ドメインをブロックしつつ、体感でも名前解決が速くなった。スマホの広告も消えて満足である。
