---
title: 解決 Windows 無法透過 hostname.local 存取同一區域網路內 Linux 主機的問題
authors: hikari
tags: [Linux, Windows, ネットワーク, Fedora]
image: /img/ogp/2026-07-18-windows-mdns-local-firewalld.png
---

在嘗試透過 `myhost.local` (mDNS) 存取同一區域網路內的 Fedora Server 時,遇到了唯獨名稱解析失敗的狀況。透過 tcpdump 直接觀察封包進行排查後,發現原因是 firewalld 封鎖了 mDNS 的傳入流量。

{/* truncate */}

## 環境

- 客戶端: Windows 11
- 伺服器: Fedora Server (Linux)
- 兩者位於同一區域網路 (例如: Windows 主機 `192.0.2.10`、Linux 主機 `192.0.2.20`)
- Linux 主機上有一個 Web 伺服器在連接埠 3000 運作

## 目標

不想直接輸入 IP 位址,而是想透過 mDNS (Avahi) 以下列方式存取。

```
http://myhost.local:3000
```

## 事前準備: 在 Linux 主機安裝 Avahi

Fedora Server 預設可能沒有安裝 Avahi,因此先進行安裝。

```bash
sudo dnf install avahi
sudo systemctl enable --now avahi-daemon
```

啟動後,若 `journalctl -u avahi-daemon` 出現以下記錄,代表主機名稱的廣播本身已在運作。

```
Registering new address record for 192.0.2.20 on eth0.IPv4.
```

即使到了這個階段,如後述,仍需要另外設定 firewalld。

## 症狀

- `http://192.0.2.20:3000` → 可以存取 (Web 伺服器、連接埠開放、IP 通訊皆正常)
- `ping myhost.local` → 「找不到主機」
- `nslookup myhost.local` → 網域不存在
- Linux 主機上的 avahi-daemon 正在運作,主機名稱的廣播記錄也如上所述正常出現
- Linux 主機的 firewalld 已開放 `3000/tcp` 等必要連接埠

乍看之下 Linux 主機與 Windows 端都運作正常,但唯獨名稱解析失敗。

## 排查步驟

### 1. Windows 端的 mDNS 用戶端是否正常運作?

```powershell
netstat -ano -p udp | findstr 5353
```

確認 Windows 的 Dnscache 服務 (DNS 用戶端) 正在監聽 UDP 5353。Windows 10 (1703 以後) / 11 已內建 mDNS 用戶端功能。

:::note 題外話
或許會浮現「Raspberry Pi 什麼都不用做就能用 `raspberrypi.local` 存取,為什麼 Fedora 不行?」的疑問。原因很單純: Raspberry Pi OS 從一開始就預先安裝了 Avahi,且預設防火牆設定 (原本 `iptables` / `nftables` 過濾在初始狀態下幾乎是停用的) 並不會封鎖 mDNS 通訊。另一方面,Fedora Server 不僅未預先安裝 Avahi,firewalld 的設計也是預設只開放最低限度的連接埠。也就是說,原因並非「Windows 端的支援狀況」不同,而是「Linux 各發行版預設設定的嚴謹程度」不同所致。
:::

### 2. Linux 主機端的 Avahi 是否在監聽?

```bash
sudo ss -lunp | grep 5353
```

```
UNCONN 0 0 0.0.0.0:5353  users:(("avahi-daemon",...))
UNCONN 0 0    [::]:5353  users:(("avahi-daemon",...))
```

確認 IPv4 / IPv6 皆正常監聽。

### 3. 封包是否確實有送達 (問題的核心)

在 Linux 主機端佈署 tcpdump,並從 Windows 端嘗試名稱解析以擷取封包。

```bash
sudo tcpdump -ni eth0 port 5353
```

```powershell
Resolve-DnsName -Name myhost.local
```

:::note 注意
單純的 `ping myhost.local` 指令,依實作方式不同,有可能不會發出 mDNS 查詢。使用 `Resolve-DnsName` (透過 DNS 用戶端 API) 才能確實送出 mDNS 查詢。即使單獨執行 ping 顯示「找不到」,也無法斷定 mDNS 本身沒有正常運作。
:::

擷取結果如下。

```
192.0.2.10.mdns > 224.0.0.251.mdns: A (QM)? myhost.local.
```

從 Windows 端發出的查詢確實有送達 Linux 主機。然而,來自 Avahi 的回應封包卻完全沒有被擷取到。

至此,可以排除網路路徑以及 Windows 端用戶端功能的問題。問題被縮小範圍到「查詢在 Linux 主機端被吞掉了」。

## 根本原因

確認 Linux 主機端 firewalld 的允許清單。

```bash
sudo firewall-cmd --list-all
```

```
services: cockpit dhcpv6-client ssh
ports: 3000/tcp 4321/tcp 5173/tcp ...
```

UDP 5353 (mDNS) 完全沒有被允許。

由於 Avahi 自身發出的多播廣播封包 (傳出方向) 觀察起來完全正常,乍看之下容易誤以為一切正常,但實際上從外部傳入的 mDNS 查詢 (傳入方向) 被 firewalld 封鎖,根本沒有送達 avahi-daemon。由於 mDNS 在沒有收到回應時只會靜默逾時,因此從錯誤訊息完全無法得知真正的原因。

## 解決方法

新增 firewalld 預先定義的服務 `mdns`。

```bash
# 確認是否正常運作 (僅限本次執行時期,重新開機後會消失)
sudo firewall-cmd --zone=<zone名稱> --add-service=mdns

# 永久套用
sudo firewall-cmd --zone=<zone名稱> --add-service=mdns --permanent
```

`mdns` 服務定義的內容如下,將目的地限制在多播位址,是相對安全的允許規則。

```
mdns
  ports: 5353/udp
  destination: ipv4:224.0.0.251 ipv6:ff02::fb
```

套用後,問題立即解決。

```powershell
Resolve-DnsName myhost.local
# → 回傳 192.0.2.20

ping myhost.local
# → 有回應

curl http://myhost.local:3000
# → 200 OK
```

## 總結

1. 「自己能夠送出多播封包」與「能夠接收多播封包」是兩個不同的問題。防火牆對於傳出與傳入的行為並不對稱,因此其中一方運作正常,不代表另一方也正常。
2. 不應僅憑 `ping` 指令來判斷 mDNS 的連線狀況。在 Windows 上使用 `Resolve-DnsName`,才能確實掌握實際送出了什麼樣的名稱解析查詢。
3. 使用 tcpdump 擷取實際封包是最快的排查手段。無論記錄或服務狀態看起來多麼正常,直接在兩端確認「查詢是否有送達」「回應是否有回傳」才是最快的方法。
4. 在 firewalld 新增服務時,使用像 `mdns` 這種目的地 (destination) 限制在多播位址的預先定義服務,可以避免開放過多不必要的存取。
5. Avahi 並非「安裝並啟動就足夠」。依發行版不同,防火牆有可能預設就是啟用且嚴謹的狀態 (Fedora 的 firewalld 就是代表案例),即使 Avahi 本身的設定正確,若未另外在 firewalld 端進行允許設定,mDNS 依然無法運作。這正是與 Raspberry Pi OS 等防火牆較寬鬆 / 停用的發行版之間的差異所在。
