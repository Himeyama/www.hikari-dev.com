---
title: 在 Linux 安裝 TeX Live 2026
authors: hikari
tags: [Linux, TeX, LaTeX]
image: /img/ogp/2026-03-27-install-texlive-2026-rocky-linux.png
---

將使用 ISO 映像在 Linux（RHEL 系）上安裝 TeX Live 2026 的步驟整理如下，適用於 RHEL 系統。

<!-- truncate -->

## 前置條件

- 具有 `sudo` 權限
- 磁碟空間至少 10 GB（ISO 約 6.4 GB + 安裝目標約 8 GB）
- 有網路連線

## Step 1: 下載 ISO 映像檔

從理化學研究所的鏡像站下載 ISO。

```bash
cd
curl -C - -O --progress-bar https://ftp.riken.jp/CTAN/systems/texlive/Images/texlive2026.iso
```

`-C -` 是在下載中斷時繼續下載的選項。

下載完成後，確認檔案大小（約 6.4 GiB）：

```bash
ls -lh ~/texlive2026.iso
```

## Step 2: 掛載 ISO 映像

建立掛載點，並將 ISO 以 loop 裝置掛載為唯讀：

```bash
sudo mkdir -p /mnt/texlive
sudo mount -o loop,ro ~/texlive2026.iso /mnt/texlive
```

確認是否掛載：

```bash
ls /mnt/texlive
```

出現如下檔案即可視為成功：

```
install-tl  archive  tlpkg  README  ...
```

## Step 3: 執行安裝程式

```bash
sudo /mnt/texlive/install-tl
```

會啟動文字介面互動選單。

### 主要操作按鍵

| 鍵 | 操作 |
|---|---|
| `S` | 選擇安裝方案 |
| `D` | 變更安裝目錄 |
| `I` | 開始安裝 |
| `Q` | 結束（取消） |

### 建議設定

- 方案: `scheme-full`（全部套件，包含日本語 LaTeX 所需的 `collection-langjapanese`）
- 安裝路徑: `/usr/local/texlive/2026`（預設）

確認設定後輸入 `I` 開始安裝。安裝需時數十分鐘。

## Step 4: 設定 PATH

將 TeX Live 的執行檔路徑加入 `~/.bashrc`：

```bash
echo 'export PATH="/usr/local/texlive/2026/bin/x86_64-linux:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 5: 修正語系 (RHEL 系)

在 RHEL 系統若未設定 locale，執行 `lualatex` 時會發生錯誤。請執行：

```bash
sudo dnf install -y glibc-langpack-en
```

另外，在 shell 啟動時設定 locale：

```bash
echo 'export LANG=C.UTF-8' >> ~/.bashrc
source ~/.bashrc
```

## Step 6: 檢查是否可正常執行

確認各指令的版本：

```bash
tex --version
lualatex --version
platex --version
```

預期輸出範例：

```
TeX 3.141592653 (TeX Live 2026)
LuaHBTeX, Version 1.24.0 (TeX Live 2026)
e-upTeX 3.141592653-p4.1.2-u2.02 (TeX Live 2026)
```

## Step 7: 測試日文編譯

建立測試檔案：

```bash
cat > /tmp/test.tex << 'EOF'
\documentclass{jlreq}
\begin{document}
日本語のテスト。TeX Live 2026 による日本語組版のサンプルです。
\end{document}
EOF
```

編譯：

```bash
cd /tmp && lualatex test.tex
```

若生成 `test.pdf` 即為成功。

## Step 8: 清理（可選）

安裝完成後，可刪除 ISO 與掛載點：

```bash
sudo umount /mnt/texlive
rm ~/texlive2026.iso
```

## 鏡像站列表

若下載速度慢，可嘗試其他鏡像站：

| 鏡像站 | URL |
|---|---|
| 理化學研究所（建議） | https://ftp.riken.jp/CTAN/systems/texlive/Images/ |
| JAIST | https://ftp.jaist.ac.jp/pub/CTAN/systems/texlive/Images/ |
| 山形大學 | https://ftp.yz.yamagata-u.ac.jp/pub/CTAN/systems/texlive/Images/ |
| CTAN 鏡像 | https://mirror.ctan.org/systems/texlive/Images/ |