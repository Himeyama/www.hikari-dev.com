---
title: 用 dnsmasq 在自家 LAN 架設 DNS 快取 + 廣告封鎖伺服器
authors: hikari
tags: [Linux, ネットワーク, Fedora, SELinux]
image: /img/ogp/2026-07-19-dnsmasq-lan-adblock-dns.webp
---

為了讓自家 LAN 的名稱解析更快、同時封鎖廣告，架設了一台 DNS 伺服器。上游使用 Cloudflare 的 `1.1.1.1`。沒有使用 Pi-hole，而是用機器上早已安裝好的輕量 dnsmasq 就完成了整套設定。這篇記錄了整個過程，包括踩到的 SELinux 問題。

{/* truncate */}

> 本文中的 IP、主機名稱等都經過遮蔽處理，請依自己的環境代換。
>
> | 佔位符 | 意義 |
> |---|---|
> | `192.168.0.0/24` | 自家 LAN 的子網段 |
> | `192.168.0.10` | 這台伺服器的 LAN IP |
> | `eth0` | 伺服器的 LAN 網卡名稱 |

## 為什麼要做這件事

- 速度: 把常用的網域快取在本機,第二次以後的名稱解析幾乎是瞬間完成。
- 廣告封鎖: 在 DNS 層級擋掉廣告與追蹤網域,LAN 內所有裝置 (包含手機) 都不用裝 App 就能消除廣告。
- 上游選 1.1.1.1: 速度快,也顧及隱私的常見選擇。

## 架構方針

| 項目 | 選擇 | 理由 |
|---|---|---|
| 軟體 | dnsmasq | 早已安裝且輕量,快取、轉發、hosts 格式封鎖一次搞定 |
| 上游 | `1.1.1.1` / `1.0.0.1` (明文 UDP 53) | 以最小化設定求簡潔,這次先不做加密 (DoT) |
| 封鎖清單 | [StevenBlack unified hosts](https://github.com/StevenBlack/hosts) | 常見選擇,以 `0.0.0.0 domain` 格式收錄約 8 萬個網域 |
| 公開範圍 | 僅限 LAN | 用防火牆把來源限制在子網段內 (避免變成開放式解析器) |

環境是 Fedora Server + SELinux Enforcing。主機端的 DNS 設定 (`systemd-resolved`) 完全不動,讓 dnsmasq 單純作為獨立的「LAN 專用服務」。

## 重點1: 不跟 systemd-resolved 搶 53 埠

在 Fedora 上,`systemd-resolved` 已經佔用 `127.0.0.53` 的 53 埠。如果 dnsmasq 想在 `0.0.0.0:53` (所有介面) 監聽,就會衝突而啟動失敗。

因此把監聽範圍限制在 LAN IP 與 loopback,並用 `bind-dynamic` 個別綁定。

```conf
# /etc/dnsmasq.d/adblock-cache.conf
interface=eth0
listen-address=127.0.0.1
bind-dynamic
```

這樣就只會佔用 `192.168.0.10:53` 與 `127.0.0.1:53`,可以和 `127.0.0.53` 上的 resolved 共存。

## dnsmasq 設定 (完整版)

```conf
# --- 監聽 (避免與 resolved 衝突) ---
interface=eth0
listen-address=127.0.0.1
bind-dynamic

# --- 固定上游為 1.1.1.1 (不讀取 /etc/resolv.conf) ---
no-resolv
server=1.1.1.1
server=1.0.0.1
server=2606:4700:4700::1111
server=2606:4700:4700::1001

# --- 快取 (加速) ---
cache-size=10000
min-cache-ttl=60

# --- 行為 ---
domain-needed # 不把沒有點的名稱轉發給上游
bogus-priv # 不外洩私有網段的反向查詢
no-hosts # 不讀取主機的 /etc/hosts
addn-hosts=/etc/dnsmasq-blocklist.hosts # 廣告封鎖清單
```

廣告封鎖的原理很單純: 用 `addn-hosts` 讀取 StevenBlack 的 hosts 檔案 (一長串 `0.0.0.0 ads.example.com`)。當查詢命中這些網域時會回傳 `0.0.0.0`,於是就連不到廣告伺服器了。

## 踩雷1: `bad option at line 15`

一開始把封鎖清單放在 `/etc/dnsmasq.d/blocklist.hosts`,結果啟動檢查就報錯:

```
dnsmasq: bad option at line 15 of /etc/dnsmasq.d/blocklist.hosts
```

原因出在 `dnsmasq.conf` 的這一行:

```conf
conf-dir=/etc/dnsmasq.d,.rpmnew,.rpmsave,.rpmorig
```

`conf-dir` 會把指定目錄底下**所有檔案都當成設定檔讀取**(唯一的排除方式是副檔名)。也就是說,連 hosts 格式的封鎖清單都被當成「設定」來解析,在 `127.0.0.1 localhost` 那一行就出現語法錯誤。

對策: 把封鎖清單放在 `/etc/dnsmasq.d/` **之外**(`/etc/dnsmasq-blocklist.hosts`)。因為 `addn-hosts` 是用完整路徑指定,放哪裡都可以。

## 踩雷2: SELinux 的 `Permission denied`

換了位置重啟後,這次語法檢查通過了,但記錄檔出現這個訊息,封鎖清單沒有生效。

```
dnsmasq: failed to load names from /etc/dnsmasq-blocklist.hosts: 許可がありません
```

檔案權限是 `644 root:root`,理論上任何人都能讀取。但還是 Permission denied。真正的元凶是 **SELinux**。

設定腳本原本的做法是「用 `curl` 下載到暫存檔 → 用 `mv` 部署到正式路徑」。問題就出在這個 `mv` 身上,它會**直接沿用暫存檔的 SELinux 標籤 `user_tmp_t`**。而 dnsmasq 的行程 (`dnsmasq_t`) 無法讀取標籤為 `user_tmp_t` 的檔案。

```console
$ ls -Z /etc/dnsmasq-blocklist.hosts
unconfined_u:object_r:user_tmp_t:s0   /etc/dnsmasq-blocklist.hosts   # 問題就在這裡
$ ls -Z /etc/dnsmasq.conf
system_u:object_r:dnsmasq_etc_t:s0    /etc/dnsmasq.conf              # 本來該有的標籤系統
```

對策: 用 `restorecon` 還原成正確的標籤 (`etc_t`)。

```console
$ sudo restorecon -Fv /etc/dnsmasq-blocklist.hosts
Relabeled /etc/dnsmasq-blocklist.hosts from unconfined_u:object_r:user_tmp_t:s0 to system_u:object_r:etc_t:s0
$ sudo systemctl restart dnsmasq
```

重啟後的記錄檔,這次終於讀取成功了。

```
dnsmasq: read /etc/dnsmasq-blocklist.hosts - 80886 names
```

> 心得: 在 SELinux 環境下使用 `mv` 會連標籤一起帶過來。只要把外部取得的檔案放進 `/etc` 底下,就養成習慣**打一次 `restorecon`**。自動更新腳本裡也把 `restorecon` 加了進去。

## 防火牆限制在 LAN 範圍內

若無條件開放 53 埠,就會變成能從外部利用的開放式解析器 (有淪為 DDoS 跳板的風險)。雖然身處家用路由器後方、並非直接暴露在網際網路上,但基於多層防禦的原則,還是把來源限制在子網段內。

```bash
firewall-cmd --permanent \
  --add-rich-rule='rule family=ipv4 source address=192.168.0.0/24 service name=dns accept'
firewall-cmd --reload
```

## 自動更新

封鎖清單每天都會更新,所以設定成每週自動重新抓取一次。透過 systemd 的計時器 (`OnCalendar=weekly`) 執行更新腳本,只有在抓取成功時才 `systemctl reload dnsmasq`。失敗時則維持舊清單,確保安全。

## 動作驗證

```console
# 是否在 LAN IP 上監聽
$ ss -tulnp | grep 192.168.0.10:53
udp  UNCONN  192.168.0.10:53
tcp  LISTEN  192.168.0.10:53

# 能正常解析名稱
$ dig @192.168.0.10 github.com +short
20.27.177.113

# 快取效果 (第 2 次為 0 msec)
$ dig @192.168.0.10 example.com | grep "Query time"
;; Query time: 27 msec
$ dig @192.168.0.10 example.com | grep "Query time"
;; Query time: 0 msec

# 廣告網域被封鎖 (回傳 0.0.0.0)
$ dig @192.168.0.10 mediavisor.doubleclick.net +short
0.0.0.0
```

`example.com` 第 2 次查詢從 27ms 降到 0ms,快取確實有效。廣告網域也如預期落在 `0.0.0.0`。

> 順帶一提,`dig @192.168.0.10 doubleclick.net` (裸網域) 依然能正常解析。StevenBlack 的清單是針對 `mediavisor.doubleclick.net` 這類**具體的廣告子網域**進行封鎖,並不會封鎖頂層網域本身。一度測錯對象讓人虛驚一場。

## LAN 端裝置設定

- 把路由器 DHCP 分配的 DNS 改成 `192.168.0.10`,可以一次套用到整個 LAN (推薦做法)。
- 若要個別設定,則手動把各裝置的 DNS 改成 `192.168.0.10`。

## 後日談: 廣告封鎖突然失效

舒適地用了一陣子之後,某天發現手機上的廣告又冒出來了。一查才發現 dnsmasq 從封鎖清單只載入了 0 筆。原因是兩個 bug 交疊在一起。

### 原因1: 封鎖清單的 SELinux 標籤又出錯了

自動更新腳本把在 `/tmp` 產生的檔案 `mv` 到 `/etc` 時,`tmp_t` 標籤殘留了下來 — 正是「踩雷2」踩過的同一個陷阱。在 SELinux Enforcing 下 dnsmasq 讀不到而被拒絕 (`Permission denied`)。

明明以為已經把 `restorecon` 加進去了,為什麼還會復發? 答案很單純: 雖然原始碼裡加了 `restorecon`,但**實際部署的腳本仍是舊版 (沒有 `restorecon`)**。原始碼的修正並沒有反映到正式環境。

### 原因2: `systemctl reload dnsmasq` 每次都失敗

`dnsmasq.service` 沒有定義 `ExecReload`,所以更新腳本的 `reload` 每次都以 exit 3 失敗。因此更新沒有生效,服務本身也被視為失敗。

### 發生經過

這兩者交疊在一起,讓故障先潛伏、再顯現:

1. 原因1讓檔案被貼上錯誤標籤。
2. 原因2讓 `reload` 失敗,dnsmasq 持續在記憶體中保留舊清單 (此時廣告封鎖還有效,所以不會發覺)。
3. 系統重開機後重新讀取檔案,因錯誤標籤而被拒絕。
4. 到這時封鎖才崩潰、問題才顯現。

「更新明明失敗卻還能運作」這種狀態,正是拖延問題被發現的原因。

### 對策

| 對象 | 修正內容 |
|---|---|
| `/etc/dnsmasq-blocklist.hosts` | 用 `restorecon` 把標籤從 `tmp_t` 還原成 `etc_t` (應急) |
| `/usr/local/bin/update-dns-blocklist.sh` (實際執行的更新腳本) | ① 加入 `restorecon` 處理 ② 把 `reload` 改成 `restart` |
| `/home/hikari/dns-ads-block/setup-dns.sh` (原始碼) | 同步把 `reload` 改成 `restart`,避免重新執行時再度復發 |

由於未定義 `ExecReload` 就無法使用 `reload`,索性改用 `restart`。

### 驗證結果

- 手動執行更新服務 → exit 0 (正常完成)。
- 載入封鎖清單 80,886 筆,標籤維持 `etc_t`。
- `doubleclick.net` 的廣告子網域 → `0.0.0.0` (封鎖 OK) ,`example.com` → 正常解析。
- 提前重現下一次自動更新 (7/27),確認不會再復發。

> 心得其二: 「改好了原始碼」和「正式環境修好了」是兩回事,要一路確認到部署為止。而在依賴 `reload` 之前,先確認該 service 是否有定義 `ExecReload`。

## 總結

- 光靠 dnsmasq 就實現了「快取加速 + 廣告封鎖 + LAN 公開」,不需要 Pi-hole。
- 踩到的雷有 2 處,都是「特定發行版的習慣」造成的:
  1. `conf-dir` 會把底下所有檔案都當成設定讀取 → hosts 檔要放在該目錄之外。
  2. SELinux 因 `mv` 而殘留的標籤造成問題 → 用 `restorecon` 還原。
- 封鎖了約 8 萬個網域,名稱解析的速度也感受得到提升。手機上的廣告也消失了,相當滿意。
- 後來,`restorecon` 的修正沒反映到正式環境、加上未定義 `ExecReload` 導致 `reload` 持續失敗,兩者交疊使廣告封鎖崩潰。原始碼的修正要一路確認到部署,`reload` 之前先確認是否有 `ExecReload`。
