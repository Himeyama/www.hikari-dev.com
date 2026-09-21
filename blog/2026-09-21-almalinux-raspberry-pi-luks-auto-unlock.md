---
title: Fedora 系 OS の Raspberry Pi で NVMe SSD を LUKS2 暗号化する
authors: hikari
tags: [Linux, AlmaLinux, Raspberry Pi, LUKS, セキュリティ]
image: /img/ogp/2026-09-21-almalinux-raspberry-pi-luks-auto-unlock.webp
---

Raspberry Pi 5 の AlmaLinux 10.1 aarch64 で、NVMe SSD の root パーティションを LUKS2 暗号化し、起動時のパスフレーズ入力を省略する構成を作った。Raspberry Pi のファームウェアが読む `/boot` は暗号化せず、暗号化した root を initramfs 内の鍵で解除する構成である。

{/* truncate */}

## 全体の流れ
以下のフローで行った。

![](/img/blog/2026-09-21-almalinux-raspberry-pi-luks-auto-unlock/luks2-migration-flow.svg)

## 完成した構成

最終的なディスク構成は次のとおりである。デバイス名と UUID は実環境を特定できないよう、記事では例示値に置き換えている。

```text
/dev/nvme0n1p1                         /boot (VFAT・暗号化なし)
/dev/nvme0n1p2                         LUKS2
  └─/dev/mapper/luks-<LUKS_UUID>       / (ext4)
```

例示値を表にまとめる。

| 項目 | 例示値 |
|---|---|
| LUKS デバイス | `/dev/nvme0n1p2` |
| LUKS UUID | `11111111-2222-3333-4444-555555555555` |
| mapper 名 | `luks-11111111-2222-3333-4444-555555555555` |
| root filesystem UUID | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` |
| `/boot` UUID | `ABCD-1234` |

実際の作業では、デバイス名と UUID を必ず次のコマンドで確認する。

```bash
lsblk -o NAME,SIZE,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS
sudo cryptsetup luksUUID /dev/nvme0n1p2
sudo blkid
```

## 暗号化される範囲

今回の構成は、物理 SSD 全体を暗号化するものではない。NVMe の root パーティション `/dev/nvme0n1p2` を LUKS2 コンテナにし、その中の ext4 を `/` として使う。`/dev/nvme0n1p1` の `/boot` は VFAT のまま残る。

Raspberry Pi のファームウェアが、Linux の initramfs より前に `/boot` の起動ファイルを読む必要があるためである。したがって、`/` 以下のデータは暗号化されるが、`/boot` のカーネル、initramfs、設定ファイル、そして自動解除用の鍵ファイルは暗号化されない。

鍵は次の 2 か所に置く。

```text
/boot/.luks-root.key
/etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

`/boot/.luks-root.key` を元鍵とし、root filesystem 側の鍵を initramfs へ埋め込む。`/boot` は root の LUKS 解除後にマウントされるため、起動初期に `/boot/.luks-root.key` を直接参照してはいけない。

## 前提

この記事では、既存の AlmaLinux root を初期化せずに LUKS2 化し、通常のパスフレーズで起動できる状態を作ってから、自動解除へ移行する流れを扱う。

- 暗号化前のバックアップがある。
- `/boot` は独立した VFAT パーティションである。
- root filesystem をアンマウントできる救援環境がある。
- 暗号化後も LUKS のパスフレーズを復旧用として残す。

root として起動中のパーティションを、そのまま変換してはいけない。暗号化対象の NVMe root を確実にアンマウントできる外部 root、救援システム、または別の OS から作業する必要がある。

## 暗号化前の準備

ここからは、既存の NVMe root を暗号化する直前までの準備である。暗号化コマンド、LUKS 鍵の登録、`crypttab` の自動解除設定は、この確認が終わってから行う。

### 暗号化前のディスク構成

暗号化前は、NVMe の root パーティションが通常の ext4 としてマウントされている。記事中のデバイス名、容量、UUID は例示値であり、作業直前に取得した値へ置き換える。

```text
/dev/nvme0n1                         NVMe SSD (約 240 GiB)
├─/dev/nvme0n1p1  vfat               /boot (約 512 MiB)
└─/dev/nvme0n1p2  ext4               / (root)
```

暗号化対象は `/dev/nvme0n1p2` である。`/dev/nvme0n1p1` は Raspberry Pi のファームウェアが読む `/boot` なので、作業対象に含めない。

作業用 USB SSD を使う場合は、NVMe と異なるデバイスであることが分かるよう、ラベルと容量を決めておく。

```text
/dev/sdb                            USB SSD (約 120 GiB)
├─/dev/sdb1        vfat             ALMA_BOOT /boot
└─/dev/sdb2        ext4             ALMA_ROOT /
```

`/dev/nvme0n1` や `/dev/sdb` は固定値ではない。再起動や抜き差しでデバイス名が変わる可能性があるため、`MODEL`、`SERIAL`、`TRAN`、容量を組み合わせて対象を確認する。

### 最初に取得する情報

まず、デバイス名、容量、モデル、シリアル、接続方式、filesystem、UUID、マウント先を一覧にする。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS,TYPE
findmnt /
findmnt /boot
cat /proc/cmdline
```

暗号化対象について、次の値を別ファイルへ記録する。

- NVMe のモデルとシリアル番号
- root パーティションのデバイス名
- root filesystem の UUID
- `/boot` の UUID
- 現在の root がどのデバイスからマウントされているか

`lsblk` だけで判断できない場合は、次も使う。

```bash
sudo blkid
sudo fdisk -l /dev/nvme0n1
```

### バックアップと復元可能性の確認

暗号化作業では、停電、デバイス名の取り違え、filesystem の縮小サイズの誤り、initramfs の設定ミスが起こり得る。暗号化前に、少なくとも次を NVMe とは別の媒体へ保存する。

1. ユーザーデータのファイルバックアップ
2. `/etc`、`/home`、サービス設定、SSH 鍵などの重要設定
3. パーティション構成と UUID の記録
4. 復元用の起動媒体

バックアップの完了は、コピーコマンドの終了コードだけで判断しない。重要ファイルを実際に開けること、コピー先の容量とファイル数が妥当であることを確認する。

ファイル単位のコピー例は次のとおりである。`/mnt/alma-root/` は実際にマウントした USB SSD の root ディレクトリへ置き換える。

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

`/home` を除外する場合は、別途 `/home` をバックアップする。除外は容量や時間を減らすための選択であり、バックアップ完了を意味しない。

`/dev`、`/proc`、`/sys`、`/run` は擬似 filesystem なので、通常のファイルとしてコピーしない。救援環境から chroot する場合は、必要に応じて後で bind mount する。

### USB SSD を作業用に準備する

USB SSD を再利用する場合、パーティションを作成する前に、対象が USB SSD であることをモデル、シリアル、接続方式、容量で確認する。パーティション作成と `mkfs` は既存データを消去するため、NVMe に対して実行してはいけない。

今回のような作業用レイアウトは次の構成である。

```text
/dev/sdb1  1 GiB       FAT32  label=ALMA_BOOT
/dev/sdb2  残り全部    ext4   label=ALMA_ROOT
```

作業前の確認:

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,MOUNTPOINTS
```

対象を確認できたら、filesystem を作成して UUID とラベルを記録する。

```bash
sudo mkfs.vfat -F 32 -n ALMA_BOOT /dev/sdb1
sudo mkfs.ext4 -L ALMA_ROOT /dev/sdb2
sudo blkid /dev/sdb1 /dev/sdb2
```

:::warning
`mkfs` は対象パーティションのデータを消去する。デバイス名だけで判断せず、直前の `lsblk` でモデル、シリアル、容量を確認すること。
:::

### USB SSD へコピーした後の設定

USB SSD を起動可能な救援環境として使う場合、USB 側の `fstab` は USB 側の UUID を参照させる。NVMe 側の UUID をそのままコピーすると、USB から起動したつもりでも NVMe を root として選ぶ可能性がある。

```text
# USB 側の /etc/fstab
UUID=<USB_ROOT_UUID>  /     ext4  defaults,noatime 0 0
UUID=<USB_BOOT_UUID>  /boot vfat  defaults,noatime 0 0
```

USB 側のブートパラメータも、USB 側の root UUID に合わせる。

```text
root=UUID=<USB_ROOT_UUID> rootfstype=ext4 rootwait
```

USB 側の initramfs を生成するときは、USB 側 root を `/mnt/root` へマウントし、`/dev`、`/proc`、`/sys`、`/run` を bind mount したうえで、USB 側 root から生成する。生成対象の root と起動対象のディスクを混同しない。

### USB 起動の確認

USB 起動を試す前後に、root と `/boot` がどのディスクからマウントされているかを確認する。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,MOUNTPOINTS
findmnt /
cat /proc/cmdline
findmnt -no SOURCE,FSTYPE,TARGET /
findmnt -no SOURCE,FSTYPE,TARGET /boot
```

期待する結果は、root と `/boot` の両方が USB SSD 上にあることである。`/dev/nvme0n1p2` が root として表示される場合、USB 起動にはなっていない。

### USB ブートで確認できたこと

USB SSD を Linux から読み取れることと、Raspberry Pi のファームウェアが同じ USB-SATA ブリッジから起動できることは別問題である。特定の USB-SATA ブリッジでは、次を試しても NVMe へフォールバックすることがある。

- USB 3 ポートへの接続
- USB SSD の MBR と GPT の切り替え
- boot flag の設定
- EEPROM の `BOOT_ORDER` 変更
- USB パーティション UUID の指定
- UAS の無効化
- USB 起動遅延の設定

USB から直接起動できない場合は、別の USB メモリ、別の USB-SATA / NVMe ケース、microSD、ネットワーク起動など、起動実績のある救援環境を使う。暗号化対象の NVMe root をマウントしたまま、同じ root をインプレース変換してはいけない。

### 暗号化直前のチェックリスト

暗号化コマンドを実行する前に、次をすべて確認する。

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS
findmnt /
findmnt /boot
swapon --show
```

- 暗号化対象が本当に root パーティションである。
- `/boot` パーティションを暗号化対象に含めないことを確認した。
- USB SSD のモデル、シリアル、容量が想定どおりである。
- NVMe root が救援環境から見てアンマウントされている。
- USB 側のコピーを読み取れる。
- バックアップの保存先が NVMe 自身ではない。
- 電源断が起きない環境である。
- LUKS ヘッダーバックアップを保存する別媒体がある。
- 既存データを消去する `luksFormat` を使わない。
- 暗号化中に USB や電源を抜かない。

ここまで完了したら、初めて LUKS2 の暗号化コマンドへ進む。暗号化後は LUKS UUID、内部 ext4 UUID、`crypttab`、`fstab`、initramfs、ブートパラメータを別々に確認する。

### 作業記録

作業で使ったコマンド、UUID、パーティション構成、起動ログ、失敗した試行を記録しておく。後で起動障害を調べるときは、次の情報が役に立つ。

- `lsblk` の出力
- `blkid` の出力
- `/etc/fstab`
- `/etc/crypttab`
- `/boot/cmdline.txt`
- `/boot/config.txt`
- `journalctl -b -k`
- Raspberry Pi EEPROM の設定

## SSD の root パーティションを LUKS2 化する

既存の ext4 を保持したままインプレースで移行する場合、`luksFormat` ではなく `cryptsetup reencrypt --encrypt` を使う。`luksFormat` は対象デバイスのデータを破壊するためである。

移行の大まかな流れは次のとおりである。

1. `lsblk` と `blkid` で対象デバイスを特定し、バックアップを確認する。
2. オフラインの ext4 を検査し、LUKS ヘッダー用の空きを作る。
3. `cryptsetup reencrypt --encrypt --type luks2` で変換する。
4. `crypttab`、`fstab`、`cmdline.txt` の UUID を更新する。
5. initramfs を再生成し、実際に起動する initramfs へ反映する。
6. 再起動後に mapper、root、`/boot` のマウント状態を確認する。

### ext4 を縮小して空きを作る

例として、オフラインの root filesystem を縮小してから変換する場合は次のようになる。縮小後のサイズは使用量とバックアップを確認したうえで決める。

```bash
sudo e2fsck -f /dev/nvme0n1p2
sudo resize2fs /dev/nvme0n1p2 <安全な縮小後サイズ>
```

### LUKS2 へインプレース変換する

既存データを保持したまま変換するため、`luksFormat` ではなく `cryptsetup reencrypt --encrypt` を使う。

```bash
sudo cryptsetup reencrypt \
  --encrypt \
  --type luks2 \
  --reduce-device-size 32M \
  /dev/nvme0n1p2
```

この処理中は電源断、強制再起動、ストレージの取り外しを行ってはいけない。完了後は LUKS UUID とヘッダーを確認する。

```bash
sudo cryptsetup luksUUID /dev/nvme0n1p2
sudo cryptsetup luksDump /dev/nvme0n1p2
```

ここで表示される LUKS UUID と、LUKS コンテナ内の ext4 UUID は別物である。`crypttab` には前者、`fstab` の `/` には後者を指定する。

## 移行後の起動設定

LUKS2 移行後は、root filesystem の UUID と `/boot` の UUID を `fstab` に設定する。LUKS の mapper 名や UUID は、実環境の値へ置き換える。

```text
# /etc/fstab
UUID=<ROOT_UUID>  /     ext4  defaults,noatime 0 0
UUID=<BOOT_UUID>  /boot vfat  defaults,noatime 0 0
```

ブートパーティションの `cmdline.txt` には、少なくとも LUKS UUID と root filesystem UUID を指定する。

```text
rd.luks.uuid=<LUKS_UUID> root=UUID=<ROOT_UUID> rootfstype=ext4 rootwait
```

この時点では通常のパスフレーズで起動できることを先に確認する。その後、自動解除用の鍵を追加して initramfs を更新する。

### initramfs を再生成する

救援環境から暗号化した root をマウントし、`chroot` 内で initramfs を再生成する。デバイス名と mapper 名は実環境の値へ置き換える。

```bash
sudo mount /dev/mapper/luks-<LUKS_UUID> /mnt/root
sudo mount /dev/nvme0n1p1 /mnt/root/boot
sudo mount --rbind /dev  /mnt/root/dev
sudo mount --rbind /proc /mnt/root/proc
sudo mount --rbind /sys  /mnt/root/sys
sudo mount --rbind /run  /mnt/root/run

sudo chroot /mnt/root dracut --regenerate-all --force --no-hostonly
```

AlmaLinux の Raspberry Pi 構成で `auto_initramfs=1` を使う場合は、この後に固定名の `/boot/initramfs8` も更新する必要がある。ここを忘れると、版付き initramfs に LUKS 設定が入っていても、起動時には古いファイルが使われる。

## 暗号化した root の自動解除

今回の自動解除は、次の流れで動く。

1. `/boot/.luks-root.key` にランダムな鍵を作成する。
2. その鍵を LUKS の追加鍵として登録する。
3. 同じ鍵を `/etc/cryptsetup-keys.d/` にコピーする。
4. `crypttab` から `/etc/cryptsetup-keys.d/` の鍵を参照する。
5. initramfs を再生成し、鍵と `crypttab` を initramfs へ取り込む。
6. Raspberry Pi が実際に読む initramfs にも同じ内容を反映する。

重要なのは、`/boot` 上の元鍵を initramfs から直接参照しないことである。root の LUKS を解除する時点では、まだ `/boot` がマウントされていないからである。

## 自動解除設定スクリプトの実行

作成済みの設定スクリプトを root 権限で実行する。この記事では、スクリプトを `/usr/local/sbin/setup-luks-boot-key.sh` に配置した例を使う。

```bash
sudo /usr/local/sbin/setup-luks-boot-key.sh
```

スクリプトは次の処理を順番に行う。

- `/boot/.luks-root.key` を作成または再利用する。
- 既存の LUKS パスフレーズを使って鍵を追加する。
- `/etc/cryptsetup-keys.d/` へ同じ鍵をコピーする。
- `crypttab` を initramfs 内から読める鍵パスへ更新する。
- 全カーネルの initramfs を再生成する。
- Raspberry Pi が使用する `/boot/initramfs8` を更新する。
- 鍵による LUKS 解除と initramfs 内の鍵の一致を検証する。

既存の鍵ファイルがある場合は、ランダムな鍵で上書きしてはいけない。鍵が LUKS に登録済みであることを検証し、同じファイルを再利用する必要がある。

### パスフレーズを環境変数で渡す場合

初回の鍵登録で対話入力を使わない場合は、パスフレーズをコマンドラインへ直接書かず、シェル履歴へ残さないように入力する。

```bash
read -rsp 'LUKS passphrase: ' LUKS_PASSPHRASE; echo
export LUKS_PASSPHRASE
sudo --preserve-env=LUKS_PASSPHRASE \
  /usr/local/sbin/setup-luks-boot-key.sh
unset LUKS_PASSPHRASE
```

`--preserve-env` に指定するのは、パスフレーズそのものではなく環境変数名 `LUKS_PASSPHRASE` である。作業が終わったら `unset` で環境変数を削除する。

## `crypttab` の確認

設定後の `/etc/crypttab` は、`/boot` ではなく `/etc/cryptsetup-keys.d/` を参照する。

```text
luks-<LUKS_UUID> UUID=<LUKS_UUID> /etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key luks
```

実例へ置き換えると次のようになる。

```text
luks-11111111-2222-3333-4444-555555555555 UUID=11111111-2222-3333-4444-555555555555 /etc/cryptsetup-keys.d/luks-11111111-2222-3333-4444-555555555555.key luks
```

`/boot/.luks-root.key` を直接指定する次のような設定は、起動初期には使えない。

```text
# 起動初期の鍵としては不適切
luks-<LUKS_UUID> UUID=<LUKS_UUID> /boot/.luks-root.key luks
```

## initramfs の確認

版付き initramfs と、Raspberry Pi が実際に読む固定名の initramfs の両方を確認する。

```bash
sudo lsinitrd /boot/initramfs8 etc/crypttab
sudo lsinitrd /boot/initramfs8 \
  etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

次のように、`crypttab` と鍵ファイルの両方が表示されればよい。

```text
etc/crypttab
etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

版付き initramfs だけを確認する方法は不十分な場合がある。

```bash
# これだけでは、実際のブート対象を確認できない場合がある
sudo lsinitrd /boot/initramfs-$(uname -r).img

# auto_initramfs=1 の構成で実際に使われるファイル
sudo lsinitrd /boot/initramfs8
```

## Raspberry Pi 固有の注意点

`/boot/config.txt` に次の設定がある場合、ファームウェアは固定名の `/boot/initramfs8` を使用する。

```text
auto_initramfs=1
```

`dracut --regenerate-all --force` だけでは、版付きの `initramfs-<kernel>.img` が更新されても `initramfs8` が古いまま残ることがある。その場合、版付き initramfs に鍵を取り込めていても、起動時には古い `initramfs8` が使われる。

したがって、更新後は次の順に確認する。

1. `dracut` が版付き initramfs を生成したことを確認する。
2. `initramfs8` が更新されたことを確認する。
3. `lsinitrd /boot/initramfs8` で `crypttab` と鍵ファイルを確認する。
4. 再起動後にパスフレーズ入力が省略されたことを確認する。

## 起動前のテスト

再起動前に、initramfs へ取り込む鍵そのもので LUKS を解除できることを確認する。

```bash
sudo cryptsetup open --test-passphrase \
  --key-file=/etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key \
  /dev/nvme0n1p2 luks-key-test
```

成功したら再起動する。

```bash
sudo systemctl reboot
```

再起動後は、root が意図した mapper からマウントされていることを確認する。

```bash
findmnt -no SOURCE,FSTYPE,TARGET /
sudo cryptsetup status luks-<LUKS_UUID>
journalctl -b --no-pager | grep -E 'systemd-cryptsetup|cryptsetup'
```

期待する状態は、`/` が `/dev/mapper/luks-<LUKS_UUID>`、`/boot` が `/dev/nvme0n1p1` になることである。

## 失敗しやすい点

### `/boot/.luks-root.key` を `crypttab` から直接参照する

initramfs の中に鍵が存在していても、`/boot` は root の解除後にマウントされる。`systemd-cryptsetup` が鍵を読めず、パスフレーズ入力へフォールバックすることがある。

`/etc/cryptsetup-keys.d/` にコピーした鍵を `crypttab` と initramfs で使う。

### 版付き initramfs だけを確認する

実際に起動するファイルが `initramfs8` なら、`initramfs-$(uname -r).img` に鍵が入っているだけでは不十分である。ブート設定に合わせて、必ず `/boot/initramfs8` を確認する。

### 鍵ファイルを上書きする

既存の鍵が LUKS へ登録済みの場合、鍵ファイルを作り直すと、initramfs と LUKS の鍵が不一致になる。既存ファイルを上書きせず、`cryptsetup open --test-passphrase` で再利用できることを確認する。

### LUKS UUID と root UUID を混同する

LUKS UUID は暗号化コンテナの識別子であり、root UUID はコンテナ内の ext4 filesystem の識別子である。`crypttab` と `fstab`、カーネルパラメータへ異なる UUID を指定する。

### `luksFormat` で既存データを消してしまう

既存データを保持したい場合に `luksFormat` を使ってはいけない。作業前に対象デバイスを確認し、暗号化前のバックアップから復旧できることも確認しておく。

## セキュリティ上の意味

この構成では `/boot` を暗号化していない。SSD を物理的に取得できる人は、`/boot` 上の鍵ファイルと initramfs 内の鍵を取得できるため、LUKS のパスフレーズを入力する構成と同じ保護にはならない。

つまり、この方式は保存時の暗号化強度よりも、再起動時の利便性を優先したものである。家庭内サーバーなど、物理アクセスを別の方法で管理できる環境には向くが、盗難時の保護を主目的にしてはいけない。

最低限、次の対策は行う。

- 鍵ファイルの権限を `600` にする。
- 既存の LUKS パスフレーズを復旧用として保管する。
- LUKS ヘッダーバックアップを SSD とは別の安全な媒体へ保存する。
- パスフレーズや鍵を記事、リポジトリ、シェル履歴へ記録しない。

LUKS ヘッダーのバックアップは次のように取得できる。保存先は暗号化対象の SSD 以外にする。

```bash
sudo cryptsetup luksHeaderBackup /dev/nvme0n1p2 \
  --header-backup-file /path/to/secure/luks-header-backup.img
```

後から TPM2 などのハードウェア保護へ移行する場合は、同じ LUKS に TPM2 用の追加鍵を登録してから、再起動と復旧手段を確認し、最後に `/boot` 鍵を削除する順番にする。

## まとめ

- `/boot` は Raspberry Pi のファームウェアが読むため、暗号化しない構成が扱いやすい。
- NVMe SSD の root パーティションを LUKS2 化し、`/boot` は Raspberry Pi の起動用に暗号化しない。
- 暗号化した root の LUKS を自動解除する鍵は、`/boot` ではなく `/etc/cryptsetup-keys.d/` 経由で initramfs に取り込む。
- `auto_initramfs=1` の場合は、版付き initramfs だけでなく `/boot/initramfs8` を必ず更新する。
- LUKS UUID と ext4 の root UUID は別々に管理する。
- `/boot` に鍵を置く方式は利便性を優先した構成であり、物理的な盗難対策にはならない。

今回の構成では、通常の起動時にパスフレーズを入力せずに済むようになった。一方で、既存のパスフレーズと LUKS ヘッダーバックアップを残しておくことで、鍵ファイルや initramfs が壊れた場合にも復旧できるようにしている。
