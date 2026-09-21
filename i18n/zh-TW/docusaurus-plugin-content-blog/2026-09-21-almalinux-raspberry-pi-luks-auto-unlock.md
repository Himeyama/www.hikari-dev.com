---
title: 在 Fedora 系 AlmaLinux 的 Raspberry Pi 上以 LUKS2 加密 NVMe SSD 並自動解鎖
authors: hikari
tags: [Linux, AlmaLinux, Raspberry Pi, LUKS, セキュリティ]
image: /img/ogp/2026-09-21-almalinux-raspberry-pi-luks-auto-unlock.webp
---

在 Raspberry Pi 5 的 AlmaLinux 10.1 aarch64 上，我將 NVMe SSD 的 root 分割區以 LUKS2 加密，並設定開機時略過輸入密碼片語。Raspberry Pi 韌體會讀取的 `/boot` 保持未加密，透過 initramfs 內的金鑰解除加密的 root。

{/* truncate */}

## 整體流程

實際作業是依照以下流程進行。

![](/img/blog/2026-09-21-almalinux-raspberry-pi-luks-auto-unlock/luks2-migration-flow.svg)

## 完成後的配置

最後的磁碟配置如下。為了避免識別實際環境，文章中的裝置名稱與 UUID 都已替換成範例值。

```text
/dev/nvme0n1p1                         /boot (VFAT・暗号化なし)
/dev/nvme0n1p2                         LUKS2
  └─/dev/mapper/luks-<LUKS_UUID>       / (ext4)
```

範例值如下。

| 項目 | 範例值 |
|---|---|
| LUKS 裝置 | `/dev/nvme0n1p2` |
| LUKS UUID | `11111111-2222-3333-4444-555555555555` |
| Mapper 名稱 | `luks-11111111-2222-3333-4444-555555555555` |
| Root 檔案系統 UUID | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` |
| `/boot` UUID | `ABCD-1234` |

實際作業時，務必使用以下指令確認裝置名稱與 UUID。

```bash
lsblk -o NAME,SIZE,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS
sudo cryptsetup luksUUID /dev/nvme0n1p2
sudo blkid
```

## 加密範圍

這個配置並不是加密整顆實體 SSD。NVMe 的 root 分割區 `/dev/nvme0n1p2` 會成為 LUKS2 容器，容器內的 ext4 檔案系統則掛載為 `/`。`/dev/nvme0n1p1` 作為 `/boot` 使用，維持 VFAT 格式。

這是因為 Raspberry Pi 韌體需要在 Linux 的 initramfs 啟動之前讀取 `/boot` 上的開機檔案。因此，`/` 以下的資料會被加密，但 `/boot` 上的核心、initramfs、設定檔，以及自動解鎖金鑰都不會被加密。

金鑰會放在以下 2 個位置。

```text
/boot/.luks-root.key
/etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

`/boot/.luks-root.key` 是來源金鑰，root 檔案系統上的副本會被嵌入 initramfs。`/boot` 只有在 root LUKS 容器解鎖後才會掛載，因此 initramfs 在開機初期不能直接讀取 `/boot/.luks-root.key`。

## 前提

本文說明不初始化既有 AlmaLinux root 檔案系統、將其轉換為 LUKS2、確認能以一般密碼片語開機，最後再改為自動解鎖的流程。

- 已有加密前的備份。
- `/boot` 是獨立的 VFAT 分割區。
- 有能夠卸載 root 檔案系統的救援環境。
- 加密後仍會保留 LUKS 密碼片語作為復原方式。

不要在分割區仍被目前執行中的 root 檔案系統使用時進行轉換。請使用外部 root、救援系統或其他作業系統，確實卸載 NVMe root 後再作業。

## 加密前的準備

本節整理既有 NVMe root 到執行加密前的準備工作。在完成這些確認之前，不要執行加密指令、註冊 LUKS 金鑰或設定 `crypttab` 的自動解鎖。

### 加密前的磁碟配置

加密前，NVMe root 分割區會以一般 ext4 檔案系統掛載。本文中的裝置名稱、容量與 UUID 都是範例，必須替換成作業前立即取得的值。

```text
/dev/nvme0n1                         NVMe SSD (約 240 GiB)
├─/dev/nvme0n1p1  vfat               /boot (約 512 MiB)
└─/dev/nvme0n1p2  ext4               / (root)
```

加密目標是 `/dev/nvme0n1p2`。`/dev/nvme0n1p1` 是 Raspberry Pi 韌體讀取的 `/boot`，因此不能納入作業範圍。

如果使用 USB SSD 作為工作環境，應選擇容易與 NVMe SSD 區分的標籤與容量。

```text
/dev/sdb                            USB SSD (約 120 GiB)
├─/dev/sdb1        vfat             ALMA_BOOT /boot
└─/dev/sdb2        ext4             ALMA_ROOT /
```

`/dev/nvme0n1` 與 `/dev/sdb` 不是固定識別值。重新開機或重新插拔後，裝置名稱可能改變，因此應綜合 `MODEL`、`SERIAL`、`TRAN` 與容量確認目標。

### 先取得資訊

先列出裝置名稱、容量、型號、序號、傳輸介面、檔案系統、UUID 與掛載點。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS,TYPE
findmnt /
findmnt /boot
cat /proc/cmdline
```

將以下加密目標的資訊記錄到獨立檔案。

- NVMe 型號與序號
- root 分割區裝置名稱
- root 檔案系統 UUID
- `/boot` UUID
- 目前 root 的掛載來源裝置

如果只看 `lsblk` 無法充分判斷，也使用以下指令。

```bash
sudo blkid
sudo fdisk -l /dev/nvme0n1
```

### 備份並確認可復原性

加密作業可能發生停電、裝置名稱搞錯、檔案系統縮小尺寸錯誤或 initramfs 設定錯誤。加密前至少要將以下內容保存到 NVMe 以外的媒體。

1. 使用者資料的檔案備份
2. `/etc`、`/home`、服務設定、SSH 金鑰等重要設定
3. 分割區配置與 UUID 紀錄
4. 用於復原的開機媒體

不要只根據複製指令的結束狀態判斷備份完成。實際開啟重要檔案，並確認目的地的容量與檔案數量合理。

以下是檔案層級複製的範例。請將 `/mnt/alma-root/` 替換成實際掛載的 USB SSD root 目錄。

```bash
sudo rsync -aHAXS --numeric-ids --info=progress2 \
  --exclude='/boot/***' \
  --exclude='/dev/***' \
  --exclude='/proc/***' \
  --exclude='/sys/***' \
  --exclude='/run/***' \
  --exclude='/tmp/***' \
  --exclude='/mnt/***' \
  --exclude='/media/***' \
  --exclude='/lost+found' \
  / /mnt/alma-root/
```

如果排除 `/home`，請另外備份 `/home`。排除它只是為了減少所需容量與時間，並不代表備份已完成。

`/dev`、`/proc`、`/sys` 與 `/run` 是虛擬檔案系統，不要將它們當作一般檔案複製。如果從救援環境進入 chroot，之後再視需要 bind mount。

### 準備作業用 USB SSD

重新使用 USB SSD 時，建立分割區之前要根據型號、序號、傳輸介面與容量確認目標確實是 USB SSD。建立分割區與執行 `mkfs` 都會清除既有資料，因此不能對 NVMe SSD 執行。

作業用磁碟可以採用以下配置。

```text
/dev/sdb1  1 GiB       FAT32  label=ALMA_BOOT
/dev/sdb2  残り全部    ext4   label=ALMA_ROOT
```

先確認目標。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,MOUNTPOINTS
```

確認目標後建立檔案系統，並記錄 UUID 與標籤。

```bash
sudo mkfs.vfat -F 32 -n ALMA_BOOT /dev/sdb1
sudo mkfs.ext4 -L ALMA_ROOT /dev/sdb2
sudo blkid /dev/sdb1 /dev/sdb2
```

:::warning
`mkfs` 會清除目標分割區的資料。不要只依賴裝置名稱，執行前要立即用 `lsblk` 確認型號、序號與容量。
:::

### 複製到 USB SSD 後的設定

如果將 USB SSD 作為可開機的救援環境，USB 端的 `fstab` 必須參照 USB 的 UUID。直接沿用 NVMe 的 UUID，可能會導致系統雖然打算從 USB 開機，最後卻選擇 NVMe 作為 root。

```text
# USB 側の /etc/fstab
UUID=<USB_ROOT_UUID>  /     ext4  defaults,noatime 0 0
UUID=<USB_BOOT_UUID>  /boot vfat  defaults,noatime 0 0
```

USB 的開機參數也必須使用 USB root UUID。

```text
root=UUID=<USB_ROOT_UUID> rootfstype=ext4 rootwait
```

產生 USB 端 initramfs 時，將 USB root 掛載到 `/mnt/root`，bind mount `/dev`、`/proc`、`/sys` 與 `/run`，並從 USB root 產生。不要混淆產生 initramfs 所使用的 root 與實際開機的磁碟。

### 確認 USB 開機

嘗試從 USB 開機前後，都要確認 root 與 `/boot` 是從哪一顆磁碟掛載的。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,MOUNTPOINTS
findmnt /
cat /proc/cmdline
findmnt -no SOURCE,FSTYPE,TARGET /
findmnt -no SOURCE,FSTYPE,TARGET /boot
```

預期結果是 root 與 `/boot` 都位於 USB SSD 上。如果顯示 `/dev/nvme0n1p2` 是 root，代表並沒有從 USB 開機。

### USB 開機測試得到的結果

Linux 能夠讀取 USB SSD，與 Raspberry Pi 韌體能否透過同一個 USB-SATA 橋接器開機，是兩個不同的問題。某些 USB-SATA 橋接器即使嘗試以下項目，仍可能回退到 NVMe。

- 連接到 USB 3 埠
- 在 MBR 與 GPT 之間切換 USB SSD 的分割區配置
- 設定 boot flag
- 修改 EEPROM 的 `BOOT_ORDER`
- 指定 USB 分割區 UUID
- 停用 UAS
- 設定 USB 開機延遲

如果無法直接從 USB 開機，請使用具備可靠開機路徑的救援環境，例如另一支 USB 隨身碟、其他 USB-SATA / NVMe 外接盒、microSD 或網路開機。不要在 NVMe root 仍掛載時，對同一個 root 執行就地轉換。

### 加密前最後檢查清單

執行加密指令前，確認以下項目全部完成。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS
findmnt /
findmnt /boot
swapon --show
```

- 確認目標確實是 root 分割區。
- 確認 `/boot` 分割區不在加密目標內。
- USB SSD 的型號、序號與容量符合預期。
- 從救援環境查看時，NVMe root 已卸載。
- 能夠讀取 USB 端的複製內容。
- 備份目的地不是 NVMe SSD 本身。
- 作業環境不會發生斷電。
- 有另一個媒體可保存 LUKS 標頭備份。
- 已確認不會使用會清除既有資料的 `luksFormat`。
- 已確認加密期間不會拔除 USB 裝置或電源。

完成這些確認後，才進入 LUKS2 加密指令。加密後要分別確認 LUKS UUID、內部 ext4 UUID、`crypttab`、`fstab`、initramfs 與開機參數。

### 記錄作業內容

記錄使用過的指令、UUID、分割區配置、開機記錄與失敗的嘗試。之後調查開機障礙時，以下資訊特別有用。

- `lsblk` 的輸出
- `blkid` 的輸出
- `/etc/fstab`
- `/etc/crypttab`
- `/boot/cmdline.txt`
- `/boot/config.txt`
- `journalctl -b -k`
- Raspberry Pi EEPROM 設定

## 將 root 分割區以 LUKS2 加密

如果要在保留既有資料的情況下就地移轉 ext4 檔案系統，請使用 `cryptsetup reencrypt --encrypt`，不要使用 `luksFormat`。`luksFormat` 會破壞目標裝置上的資料。

移轉的大致流程如下。

1. 使用 `lsblk` 與 `blkid` 確認目標裝置，並確認備份。
2. 檢查離線的 ext4 檔案系統，為 LUKS 標頭準備空間。
3. 使用 `cryptsetup reencrypt --encrypt --type luks2` 進行轉換。
4. 更新 `crypttab`、`fstab` 與 `cmdline.txt` 中的 UUID。
5. 重新產生 initramfs，並將變更套用到實際用於開機的 initramfs。
6. 重新開機後，確認 mapper、root 與 `/boot` 的掛載狀態。

### 縮小 ext4 以準備空間

例如，先縮小離線的 root 檔案系統再進行轉換。縮小後的容量必須在確認使用量與備份後決定。

```bash
sudo e2fsck -f /dev/nvme0n1p2
sudo resize2fs /dev/nvme0n1p2 <安全な縮小後サイズ>
```

### 就地轉換為 LUKS2

為了在轉換期間保留既有資料，使用 `cryptsetup reencrypt --encrypt`，不要使用 `luksFormat`。

```bash
sudo cryptsetup reencrypt \
  --encrypt \
  --type luks2 \
  --reduce-device-size 32M \
  /dev/nvme0n1p2
```

處理期間不要斷電、強制重新開機或拔除儲存裝置。完成後確認 LUKS UUID 與標頭。

```bash
sudo cryptsetup luksUUID /dev/nvme0n1p2
sudo cryptsetup luksDump /dev/nvme0n1p2
```

這裡顯示的 LUKS UUID 與 LUKS 容器內 ext4 的 UUID 不同。前者要放在 `crypttab`，後者要放在 `fstab` 的 `/`。

## 移轉後的開機設定

LUKS2 移轉後，在 `fstab` 設定 root 檔案系統 UUID 與 `/boot` UUID。請將 mapper 名稱與 UUID 替換成實際環境的值。

```text
# /etc/fstab
UUID=<ROOT_UUID>  /     ext4  defaults,noatime 0 0
UUID=<BOOT_UUID>  /boot vfat  defaults,noatime 0 0
```

在開機分割區的 `cmdline.txt` 中，至少指定 LUKS UUID 與 root 檔案系統 UUID。

```text
rd.luks.uuid=<LUKS_UUID> root=UUID=<ROOT_UUID> rootfstype=ext4 rootwait
```

先確認系統能以一般密碼片語開機，再加入自動解鎖金鑰並更新 initramfs。

### 重新產生 initramfs

從救援環境掛載加密後的 root，並在 `chroot` 中重新產生 initramfs。請將裝置名稱與 mapper 名稱替換成實際環境的值。

```bash
sudo mount /dev/mapper/luks-<LUKS_UUID> /mnt/root
sudo mount /dev/nvme0n1p1 /mnt/root/boot
sudo mount --rbind /dev  /mnt/root/dev
sudo mount --rbind /proc /mnt/root/proc
sudo mount --rbind /sys  /mnt/root/sys
sudo mount --rbind /run  /mnt/root/run

sudo chroot /mnt/root dracut --regenerate-all --force --no-hostonly
```

在使用 `auto_initramfs=1` 的 AlmaLinux Raspberry Pi 配置中，之後還必須更新固定名稱的 `/boot/initramfs8`。如果忘記這一步，即使 LUKS 設定已經寫入版本化 initramfs，開機時仍會使用舊檔案。

## 自動解鎖加密後的 root

自動解鎖的流程如下。

1. 在 `/boot/.luks-root.key` 建立隨機金鑰。
2. 將金鑰註冊為額外的 LUKS 金鑰。
3. 將相同金鑰複製到 `/etc/cryptsetup-keys.d/`。
4. 讓 `crypttab` 參照 `/etc/cryptsetup-keys.d/` 下的金鑰。
5. 重新產生 initramfs，將金鑰與 `crypttab` 一起納入。
6. 將相同內容套用到 Raspberry Pi 實際使用的 initramfs。

重點是不要讓 initramfs 直接從 `/boot` 讀取原始金鑰。解除 root LUKS 容器時，`/boot` 尚未掛載。

## 執行自動解鎖設定指令稿

以 root 權限執行準備好的設定指令稿。本文假設指令稿放在 `/usr/local/sbin/setup-luks-boot-key.sh`。

```bash
sudo /usr/local/sbin/setup-luks-boot-key.sh
```

指令稿會依序執行以下操作。

- 建立或重新使用 `/boot/.luks-root.key`。
- 使用既有的 LUKS 密碼片語加入金鑰。
- 將相同金鑰複製到 `/etc/cryptsetup-keys.d/`。
- 將 `crypttab` 更新為 initramfs 可讀取的金鑰路徑。
- 為所有核心重新產生 initramfs。
- 更新 Raspberry Pi 使用的 `/boot/initramfs8`。
- 驗證金鑰能解除 LUKS，且 initramfs 內含相符的金鑰。

如果已經有金鑰檔案，不要用新的隨機金鑰覆寫。請確認該金鑰已註冊到 LUKS，並重新使用相同檔案。

### 透過環境變數傳遞密碼片語

如果第一次註冊金鑰時不想使用互動式輸入，請不要將密碼片語直接寫在指令列中，並避免留下 shell 歷史紀錄。

```bash
read -rsp 'LUKS passphrase: ' LUKS_PASSPHRASE; echo
export LUKS_PASSPHRASE
sudo --preserve-env=LUKS_PASSPHRASE \
  /usr/local/sbin/setup-luks-boot-key.sh
unset LUKS_PASSPHRASE
```

`--preserve-env` 指定的是環境變數名稱 `LUKS_PASSPHRASE`，不是密碼片語本身。作業完成後使用 `unset` 移除環境變數。

## 確認 `crypttab`

設定後的 `/etc/crypttab` 應參照 `/etc/cryptsetup-keys.d/`，而不是 `/boot`。

```text
luks-<LUKS_UUID> UUID=<LUKS_UUID> /etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key luks
```

將範例值展開後如下。

```text
luks-11111111-2222-3333-4444-555555555555 UUID=11111111-2222-3333-4444-555555555555 /etc/cryptsetup-keys.d/luks-11111111-2222-3333-4444-555555555555.key luks
```

以下直接指定 `/boot/.luks-root.key` 的設定無法在開機初期使用。

```text
# 起動初期の鍵としては不適切
luks-<LUKS_UUID> UUID=<LUKS_UUID> /boot/.luks-root.key luks
```

## 確認 initramfs

同時確認版本化 initramfs，以及 Raspberry Pi 實際讀取的固定名稱 initramfs。

```bash
sudo lsinitrd /boot/initramfs8 etc/crypttab
sudo lsinitrd /boot/initramfs8 \
  etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

應該同時顯示 `crypttab` 與金鑰檔案。

```text
etc/crypttab
etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

只確認版本化 initramfs 可能不夠。

```bash
# これだけでは、実際のブート対象を確認できない場合がある
sudo lsinitrd /boot/initramfs-$(uname -r).img

# auto_initramfs=1 の構成で実際に使われるファイル
sudo lsinitrd /boot/initramfs8
```

## Raspberry Pi 特有的注意事項

如果 `/boot/config.txt` 含有以下設定，韌體會使用固定名稱的 `/boot/initramfs8`。

```text
auto_initramfs=1
```

只執行 `dracut --regenerate-all --force` 時，版本化的 `initramfs-<kernel>.img` 可能已更新，但 `initramfs8` 仍然是舊檔案。此時金鑰雖然存在於版本化 initramfs 中，開機時仍會使用舊的 `initramfs8`。

更新後依序確認以下項目。

1. 確認 `dracut` 已產生版本化 initramfs。
2. 確認 `initramfs8` 已更新。
3. 執行 `lsinitrd /boot/initramfs8`，確認 `crypttab` 與金鑰檔案。
4. 重新開機，確認不再要求輸入密碼片語。

## 重新開機前的測試

重新開機前，使用將被嵌入 initramfs 的相同金鑰，確認能解除 LUKS。

```bash
sudo cryptsetup open --test-passphrase \
  --key-file=/etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key \
  /dev/nvme0n1p2 luks-key-test
```

成功後重新開機。

```bash
sudo systemctl reboot
```

重新開機後，確認 root 是從預期的 mapper 掛載。

```bash
findmnt -no SOURCE,FSTYPE,TARGET /
sudo cryptsetup status luks-<LUKS_UUID>
journalctl -b --no-pager | grep -E 'systemd-cryptsetup|cryptsetup'
```

預期狀態是 `/` 從 `/dev/mapper/luks-<LUKS_UUID>` 掛載，`/boot` 從 `/dev/nvme0n1p1` 掛載。

## 容易失敗的地方

### 在 `crypttab` 直接參照 `/boot/.luks-root.key`

即使 initramfs 內存在金鑰，`/boot` 也要等 root 解鎖後才會掛載。`systemd-cryptsetup` 可能無法讀取金鑰，最後回退到要求輸入密碼片語。

`crypttab` 與 initramfs 都要使用 `/etc/cryptsetup-keys.d/` 下的副本。

### 只確認版本化 initramfs

如果實際開機檔案是 `initramfs8`，只有在 `initramfs-$(uname -r).img` 內放入金鑰仍然不夠。請按照開機配置確認 `/boot/initramfs8`。

### 覆寫金鑰檔案

如果既有金鑰已註冊到 LUKS，重新建立金鑰檔案會造成 initramfs 與 LUKS 的金鑰不一致。不要覆寫既有檔案，請使用 `cryptsetup open --test-passphrase` 確認仍可使用。

### 混淆 LUKS UUID 與 root UUID

LUKS UUID 是加密容器的識別碼，root UUID 則是容器內 ext4 檔案系統的識別碼。`crypttab`、`fstab` 與核心參數應使用不同的 UUID。

### 使用 `luksFormat` 破壞既有資料

需要保留既有資料時，不要使用 `luksFormat`。開始前確認目標裝置，並確定加密前的備份能夠用來復原系統。

## 安全性上的意義

這個配置不會加密 `/boot`。能夠實體取得 SSD 的人，可以取得 `/boot` 上的金鑰檔案與 initramfs 內的金鑰，因此它不具有與要求輸入 LUKS 密碼片語相同的保護力。

換句話說，這個方法優先考量重新開機時的便利性，而不是靜態資料的加密強度。它適合實體存取另有控管的家用伺服器，但不應作為防止裝置遭竊的主要保護措施。

至少應採取以下措施。

- 將金鑰檔案的權限設為 `600`。
- 保留既有的 LUKS 密碼片語作為復原方式。
- 將 LUKS 標頭備份保存到 SSD 以外的安全媒體。
- 不要在文章、儲存庫或 shell 歷史紀錄中記錄密碼片語或金鑰。

使用以下指令備份 LUKS 標頭。備份位置應在加密 SSD 以外。

```bash
sudo cryptsetup luksHeaderBackup /dev/nvme0n1p2 \
  --header-backup-file /path/to/secure/luks-header-backup.img
```

如果之後要移轉到 TPM2 等硬體保護，請先在相同的 LUKS 容器註冊 TPM2 金鑰，確認重新開機與復原流程，最後才刪除 `/boot` 金鑰。

## 總結

- 使用 LUKS2 加密 NVMe SSD 的 root 分割區，同時為了 Raspberry Pi 的開機流程保留未加密的 `/boot`。
- 將自動解鎖加密 root 的金鑰透過 `/etc/cryptsetup-keys.d/` 放入 initramfs，不要直接參照 `/boot`。
- 啟用 `auto_initramfs=1` 時，除了版本化 initramfs，也一定要更新 `/boot/initramfs8`。
- 分開管理 LUKS UUID 與 ext4 root UUID。
- 將金鑰放在 `/boot` 是優先考量便利性的配置，不能防止實體竊取。

完成這個配置後，平常開機時不必輸入密碼片語。保留原本的密碼片語與 LUKS 標頭備份，仍可在金鑰檔案或 initramfs 損壞時進行復原。
