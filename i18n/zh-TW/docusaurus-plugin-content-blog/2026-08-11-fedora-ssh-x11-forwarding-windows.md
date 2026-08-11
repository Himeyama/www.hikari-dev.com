---
title: 從 Fedora 到 Windows,透過 SSH 只轉發 GUI 應用程式
authors: hikari
tags: [Linux, Windows, Fedora, SSH, ネットワーク]
image: /img/ogp/2026-08-11-fedora-ssh-x11-forwarding-windows.webp
---

這台 Fedora 43 Server 既沒有安裝 X 伺服器,也沒有安裝桌面環境。現在想從這台機器把 GUI 應用程式顯示到 Windows 電腦上。這是一篇不安裝桌面環境,改用 SSH X11 轉發只傳送「單一應用程式」的紀錄。

{/* truncate */}

## 首先要破除的誤解:GNOME Shell 無法透過 X11 轉發

想到「安裝 GNOME 再透過 SSH 轉發」時,很自然會想輸入 `dnf group install gnome-desktop`。但這個想法有個前提上的誤解。

**GNOME Shell 是 Wayland 合成器,無法透過 SSH 的 X11 轉發傳送。** X11 轉發能傳送的,只有以 X11 用戶端形式運作的「個別應用程式」,而不是桌面環境本身。

也就是說,依目的不同,架構會完全分歧。

| 想做的事 | 使用的技術 | 伺服器端需要的東西 |
|---|---|---|
| 轉發個別 GUI 應用程式 | SSH X11 轉發 | 只需 GUI **應用程式**(不需要 X 伺服器) |
| 使用整個桌面 | xrdp + RDP | 完整 GNOME + Xorg + xrdp |

這次採用前者。因為 **X 伺服器是在 Windows 端運作**,所以 Fedora 端不需要 `Xorg`(`@base-x`)、`gnome-shell`,也不需要 `gdm`。不必在伺服器上增加常駐服務,是這個架構最大的優點。

## 環境

- Fedora Linux 43 (Server Edition) / `systemctl get-default` = `multi-user.target`
- SELinux Enforcing
- 用戶端為同一區網內的 Windows 電腦

### 事先已經具備的條件(不需額外處理)

事先確認後發現,在 Fedora Server 的預設狀態下,以下項目已經齊備。先盤點這些,就能大致掌握工作量。

| 前提條件 | 狀態 |
|---|---|
| `xorg-x11-xauth` | 已安裝(X11 轉發的必要條件) |
| 日文字型(Noto CJK、`langpacks-fonts-ja`) | 已安裝 |
| `dbus-broker` + 使用者工作階段匯流排 `/run/user/1000/bus` | 執行中(啟動 GNOME 應用程式所需) |
| `mesa-libGL` / `mesa-dri-drivers` | 已安裝 |

尤其 `xorg-x11-xauth` 一開始就已安裝這點很重要。若沒有它,X11 轉發就無法配發驗證用的 cookie,即使執行 `ssh -X` 也不會設定 `DISPLAY`。

## Step 1:確認 sshd 的 X11 轉發設定

首先查看目前實際生效的值。與其讀取設定檔,不如用 `sshd -T` 確認「實際生效的值」更可靠(需要 root 權限)。

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

**Fedora 43 預設就是 `x11forwarding yes`。** 因此這個步驟不需要變更。`x11uselocalhost yes` 也是只在本機迴路監聽的安全設定,維持原樣即可。

若 `x11forwarding` 為 `no` 的情況下,不要直接修改 `/etc/ssh/sshd_config` 本體,而是放置一個 drop-in 檔案(Fedora 的 sshd_config 開頭已包含 `Include /etc/ssh/sshd_config.d/*.conf`)。

```bash
sudo tee /etc/ssh/sshd_config.d/10-x11-forwarding.conf >/dev/null <<'EOF'
X11Forwarding yes
X11UseLocalhost yes
X11DisplayOffset 10
EOF

sudo sshd -t && sudo systemctl reload sshd
```

:::note
不需要變更防火牆與 SELinux 設定。X11 轉發只是在 22 埠內建立通道,不會開啟新的埠,且已在標準的 `sshd_t` 政策中獲得允許。
:::

## Step 2:安裝 GUI 應用程式與用於排查的工具

```bash
sudo dnf install nautilus gnome-text-editor gnome-system-monitor loupe xterm xeyes xdpyinfo
```

- `nautilus` — 檔案管理員
- `gnome-text-editor` — 標準文字編輯器
- `gnome-system-monitor` — 系統監視器
- `loupe` — 圖片檢視器(Fedora 43 的標準應用程式,`eog` 已是舊世代)
- `xterm` / `xeyes` / `xdpyinfo` — 用於連線確認

### 注意:Fedora 43 中 `xorg-x11-apps` 已被拆分

提到確認 X11 轉發是否正常,通常會想到 `xeyes`,但 **Fedora 43 已經沒有 `xorg-x11-apps` 這個套件了**。`xeyes` / `xdpyinfo` 分別被拆分成獨立的套件,所以需要個別指定。

```
xeyes-1.3.0-6.fc43.x86_64    : A follow the mouse X demo
xdpyinfo-1.3.4-3.fc43.x86_64 : X11 display information utility
```

這些工具的相依性比 GNOME 應用程式淺,有助於判斷「究竟是 X 轉發本身壞掉,還是 GNOME 應用程式端的問題」。

實際安裝約為 44 個套件 / 125 MiB 左右。因為沒有安裝桌面環境,所以只需要這樣的程度。GTK4 與 glib 相關套件本來就已安裝,也是原因之一。

## Step 3:在 Windows 端建立 X 伺服器

使用 **VcXsrv**。`XLaunch` 的設定如下。

- Display settings:**Multiple windows**(每個應用程式會成為獨立的視窗)
- Display number:**0**
- Client startup:**Start no client**
- Extra settings:開啟 **Clipboard** 與 **Primary Selection**,**Native opengl** 則**關閉**
- "Disable access control" 先保持關閉狀態嘗試
- 防火牆對話方塊選擇**僅允許私人網路**

關閉 `Native opengl` 是重點。開啟的話,GNOME 應用程式容易在 GLX 相關處當機。

將設定儲存為 `config.xlaunch`,下次就能一鍵啟動。

接著,告訴 Windows 的 OpenSSH 用戶端 X 伺服器的位置。

```powershell
setx DISPLAY "localhost:0.0"
```

`setx` 不會套用到現有的工作階段,因此**需要重新開啟終端機**。

## Step 4:設定 SSH 用戶端

寫在 `%USERPROFILE%\.ssh\config` 裡,之後就不必每次都加上選項。

```
Host fedora
    HostName 192.0.2.20
    User hikari
    ForwardX11 yes
    ForwardX11Trusted yes
```

### 加上 `ForwardX11Trusted yes` 的原因

Windows 的 OpenSSH 用戶端**沒有附帶 `xauth`**。因此非 trusted 的 `-X` 轉發有時會因無法產生驗證用 cookie 而導致 GUI 無法顯示。改用相當於 `-Y` 的 trusted 轉發即可避免此問題。

不過 trusted 轉發會讓轉發端的應用程式對本機 X 伺服器擁有不受限制的存取權(可能窺視其他視窗的按鍵輸入)。這裡是因為對方是自己在區網內的虛擬機才可以接受,**絕不可用於不信任的主機**。

## Step 5:確認連線

在啟動 XLaunch 的狀態下執行 `ssh fedora`,依相依性由淺至深依序確認。這個順序本身就是排查的過程。

```bash
# 1. DISPLAY 是否已自動設定(應為類似 localhost:10.0 的值)
echo $DISPLAY

# 2. 驗證 cookie 是否已配發(應有與 $DISPLAY 相同編號的一行)
xauth list

# 3. 是否能連線到 X 伺服器
xdpyinfo | head -20

# 4. 繪圖確認 — 若 Windows 上出現視窗,即代表轉發成功
xeyes
xterm

# 5. 確認 GNOME 應用程式
gnome-text-editor
nautilus
gnome-system-monitor
```

`DISPLAY` 之所以會是 `localhost:10.0`,是因為 sshd 的 `X11DisplayOffset 10` 設定所致。伺服器端的 `:10` 經由通道傳送,最終到達 Windows 端的 `:0`,形成兩段式的架構。

### 排查對照表

| 症狀 | 原因 |
|---|---|
| `echo $DISPLAY` 為空 | sshd 端的設定,或 Windows 端的 `DISPLAY` 環境變數尚未生效 |
| `xdpyinfo` 顯示 `unable to open display` | Windows 端的 X 伺服器未啟動,或被防火牆封鎖 |
| `xeyes` 能顯示但 GNOME 應用程式不行 | D-Bus 或字型的問題。在前景執行並查看錯誤輸出 |
| `Authorization required, but no authorization protocol specified` | 重新以「Disable access control」開啟的狀態啟動 XLaunch |
| 日文顯示為方塊(□) | 用 `fc-list :lang=ja \| head` 確認字型 |

## 確認對伺服器造成的影響

由於是正式運作中的伺服器,因此確認安裝後是否增加了多餘的東西。

相依套件中包含了 **`wsdd`**(Windows 網路探索服務,源自 gvfs 的 SMB 整合功能),雖然一度感到在意,但

```bash
systemctl is-enabled wsdd   # → disabled
systemctl is-active wsdd    # → inactive
```

因預設為停用狀態,所以不需處理。也確認了常駐服務與監聽的埠,結果如下:

- 新啟動的常駐服務:**無**
- 新增的監聽埠:**無**(22 / 6443 / 53 等維持原狀)

`systemctl get-default` 也維持為 `multi-user.target`。結果正如不安裝桌面環境這個架構所設想的一樣。

## 已知的限制

- **避免使用 `gnome-terminal` / `ptyxis`。** 這些應用程式因設計上透過 D-Bus 啟用機制共用單一伺服器行程(`*-server`),會固定在第一次啟動時的 `DISPLAY` 上。重新建立 SSH 連線後不會跟隨新的 `DISPLAY`,可能導致視窗無法顯示。轉發用的終端機**使用 `xterm`** 較為可靠。
- **繪圖效能。** 在區網內使用輕量級應用程式還算實用,但捲動與影片播放會較慢。另外 `ssh -C`(壓縮)在區網內容易造成反效果,因此不使用。
- **3D/GL。** 無法使用硬體加速,會退回間接 GLX 或軟體繪圖。若使用 GL 的應用程式當機,可嘗試設定 `LIBGL_ALWAYS_INDIRECT=1`。

## 總結

- **GNOME Shell 無法透過 X11 轉發。** 能轉發的只有個別應用程式。若一開始沒理解這點,就會白白安裝了不需要的桌面環境。
- 因為 X 伺服器是在 Windows 端運作,所以**伺服器端完全不需要 Xorg 或桌面環境**。這次只需約 44 個套件 / 125 MiB,也沒有增加常駐服務或監聽埠。
- **Fedora 43 的 sshd 預設就啟用 X11 轉發。** 先用 `sudo sshd -T | grep -i x11` 確認實際生效的值,就能避免多餘的設定變更。
- Fedora 43 中 **`xorg-x11-apps` 已被拆分成獨立套件**。`xeyes` / `xdpyinfo` 需個別指定。
- 由於 Windows 的 OpenSSH 沒有 `xauth`,**`ForwardX11Trusted yes`** 實際上是必要的。僅限用於信任的對象。

若之後想要完整的桌面環境,可以改用安裝 `xrdp` + `xorgxrdp` + GNOME,再透過 Windows 內建的遠端桌面連線的架構。屆時還需要另外在 firewalld 開放 3389/tcp。

曾遇過 `xeyes` 能顯示,但唯獨 `nautilus` 怎麼都啟動不了的情況,該排查過程整理在[後續文章](/blog/2026/08/11/fedora-nautilus-x11-crash)中。
