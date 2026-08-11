---
title: 透過 SSH X11 轉發時,GUI 應用程式無法啟動
authors: hikari
tags: [Linux, Windows, Fedora, SSH, ネットワーク]
image: /img/ogp/2026-08-11-fedora-nautilus-x11-crash.webp
---

依照[上一篇文章](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows)的步驟建立了 SSH X11 轉發環境,`xeyes` 順利顯示在 Windows 端。然而 `nautilus` 卻怎麼都啟動不了。這是一篇記錄「明明 `DISPLAY` 已經正常運作,為什麼偏偏這個應用程式會當掉」的排查過程。

{/* truncate */}

## 症狀

```
$ nautilus
** Message: 23:27:59.343: Connecting to org.freedesktop.Tracker3.Miner.Files
nautilus-application-Message: 23:27:59.344: Failed to initialize display server connection: Unsupported or missing session type 'tty'
libEGL warning: DRI3 error: Could not get DRI3 device
libEGL warning: Ensure your X server supports DRI3 to get accelerated rendering
Couldn't open libGLESv2.so.2: 無法開啟共用物件檔案: 沒有此檔案或目錄
已中止 (core dumped)
```

另一方面,`xeyes` 在同一個 shell 中沒有做任何設定變更就順利顯示在 Windows 端。也就是說 X11 轉發本身確定是正常運作的,卻只有 GNOME 應用程式被拒絕。

## 原因① : xeyes 與 nautilus 要求的水準不同

`xclock` / `xlogo` / `xeyes` 是傳統的 Xlib 應用程式,只需要 `DISPLAY` 變數與連往 X 伺服器的 TCP 連線就能運作。

相對地,`nautilus` 是屬於 GNOME 的現代 GTK 應用程式,要求的不只是單純的 X11 連線。

| 檢查項目 | 檢查的內容 |
|---|---|
| 工作階段類型 | 是否已在 `systemd-logind` 中登記為「圖形化工作階段」 |
| D-Bus / Tracker3 | 與檔案搜尋索引服務的整合 (記錄檔開頭的 `Connecting to org.freedesktop.Tracker3.Miner.Files`) |
| EGL/GLES | 繪圖所使用的 GPU 加速基礎架構 |

錯誤訊息 `Unsupported or missing session type 'tty'` 正是這個問題。SSH 的 X11 轉發 (相當於 `ssh -X`) 雖然能讓 `DISPLAY` 可用,但在 `loginctl` 上仍然維持「tty 工作階段」的狀態,並未被視為正式的圖形化工作階段 (x11/wayland)。因此 nautilus 在這一步就拒絕啟動。

### 對策: 用環境變數繞過工作階段類型檢查

直接修改 `systemd-logind` 本身的設定 (PAM 端) 影響範圍太大,所以先嘗試較輕量的繞過方式。

```bash
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11 nautilus
```

這樣就解決了 `Unsupported or missing session type 'tty'` 的錯誤。看來 GTK 端會先檢查環境變數,才會向 logind 查詢,所以只靠環境變數就通過了這一關。

## 原因② : 系統中不存在 libGLESv2.so.2

即使繞過了工作階段檢查,程序仍持續以 exit code 134 (SIGABRT、core dump) 當掉。記錄檔中留下的關鍵一行是這個。

```
Couldn't open libGLESv2.so.2: 無法開啟共用物件檔案: 沒有此檔案或目錄
```

即使用 `LIBGL_ALWAYS_SOFTWARE=1` 強制軟體繪圖也沒有改善。這並不是「GPU 無法使用」的設定問題,而是「函式庫檔案根本不存在」的安裝問題,所以無論怎麼切換繪圖模式都毫無意義。

### 排查: 哪個套件提供了這個檔案

```bash
$ dnf provides '*/libGLESv2.so.2'
libglvnd-gles-1:1.7.0-8.fc43.x86_64 : GLES support for libglvnd
Repo         : fedora
Matched From :
Filename     : /usr/lib64/libGLESv2.so.2
```

[上一篇文章](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows)中已確認 `mesa-libGL` 已安裝,但 `libglvnd-gles` (GLES 相容層) 是另一個獨立的套件,而它尚未安裝。Fedora 43 的 GL 相關套件就是這樣細分的,所以很容易因為「應該已經裝了 mesa 系列套件」的認知而疏忽。

```bash
sudo dnf install -y libglvnd-gles
```

## 結果

```bash
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11 nautilus
```

程序不再 core dump,持續運作,視窗也顯示在 Windows 端了。剩下的記錄只有以下警告,並非致命錯誤。

```
libEGL warning: DRI3 error: Could not get DRI3 device
libEGL warning: Ensure your X server supports DRI3 to get accelerated rendering
```

由於無法使用 GPU 加速而回退到軟體繪圖,操作起來會有點遲滯,但實際使用上沒有問題。

## 排查表 (補充)

| 症狀 | 原因 | 對策 |
|---|---|---|
| `xeyes` 能顯示,但只有 GNOME 應用程式出現 `Unsupported or missing session type 'tty'` | SSH 的 tty 工作階段未被 logind 視為圖形化工作階段 | 加上 `XDG_SESSION_TYPE=x11 GDK_BACKEND=x11` 再啟動 |
| 工作階段錯誤消失了,但仍以「已中止 (core dumped)」當掉 | `Couldn't open libGLESv2.so.2` = 函式庫本身未安裝 | 用 `dnf provides '*/libGLESv2.so.2'` 找出提供該檔案的套件並安裝 (`libglvnd-gles`) |
| 加上 `LIBGL_ALWAYS_SOFTWARE=1` 也沒有改善 | 並非驅動選擇的問題,而是函式庫檔案缺失所致,兩者無關 | 應透過安裝套件解決,而非切換繪圖模式 |

## 總結

- **看到 `xeyes` 能顯示 ≠ GNOME 應用程式也能運作。** 傳統 Xlib 應用程式與現代 GTK 應用程式所要求的前提條件完全不同。確認 X11 轉發的連通性與確認 GNOME 應用程式能否運作,應該視為兩個不同的排查步驟。
- **SSH 的 X11 轉發只是讓 `DISPLAY` 可用,並不會改變 `systemd-logind` 上記錄的工作階段類型。** 對於像 nautilus 這種會檢查工作階段類型的應用程式,有時可以用 `XDG_SESSION_TYPE=x11 GDK_BACKEND=x11` 這組環境變數繞過去。
- **「找不到函式庫」的錯誤,無法透過切換繪圖模式 (`LIBGL_ALWAYS_SOFTWARE` 等) 解決。** 用 `dnf provides '*/<檔名>'` 找出提供該檔案的套件並直接安裝,才是比較快的做法。
- Fedora 43 的 mesa 相關套件切分得相當細。即使已安裝 `mesa-libGL`,`libglvnd-gles` (GLES 支援) 有時仍需另外安裝。
- 雖然能運作了,但沒有 GPU 加速的 X11 轉發在繪圖上還是偏重。若追求更順暢的體驗,可以考慮切換成[上一篇文章](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows)文末提到的 `xrdp` + 完整桌面環境架構。
