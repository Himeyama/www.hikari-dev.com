---
title: Ubuntu 系の Linux ディストリビューションの自作方法
tags: [Ubuntu, Linux]
layout: default
---

## 概要
1. iso ファイル (ディスクイメージ) を展開
2. squashfs ファイル (`/` の中、ファイルシステムイメージ) を展開
3. (2.) で展開してものに対し、カスタマイズするためのスクリプトを適用
4. (3.) から squashfs を作成 (`mksquashfs` コマンド)
5. (4.) を (1.) に入れて、チェックサムやファイルサイズ、パッケージのリストを更新
6. (5.) を iso ファイルを作成 (`xorriso` コマンドを使用)

この流れで、Ubuntu の改造ディストリビューションを作成できます。

## 用意するもの
- Ubuntu のイメージ

## 必要なパッケージのインストール
```bash
sudo apt install cd-boot-images-amd64 xorriso
```

パッケージがないとかでインストールができない場合は以下を実行し再度実行してください。

```bash
echo "deb http://cz.archive.ubuntu.com/ubuntu jammy main" | sudo tee -a /etc/apt/sources.list
sudo apt update
```

## 展開とマウント
```bash
# DISK_IMAGE はディスクイメージのパスです。
DISK_IMAGE=/mnt/d/ubuntu-22.04-desktop-amd64.iso

# RELEASENOTE_URL はリリースノートの URL です。
RELEASENOTE_URL="http://"

# 作業ディレクトリーの作成
mkdir ~/my-distribution
cd ~/my-distribution

# ディスクイメージのシンボリックリンクを作成します。
ln -s $DISK_IMAGE image.iso

# ディスクイメージをマウント
# 警告が出ますが無視してください。
mkdir mnt
sudo mount -o loop image.iso mnt

# ディスクイメージのコピー
# マウントした場所は書き換えができないのでコピーします。
# ただし、ディストリビューションのファイルシステムである /casper/filesystem.squashfs は除外してコピーします。
mkdir disk
rsync -P -a --exclude=/casper/filesystem.squashfs mnt/ disk

# ファイルシステムイメージのマウント
mkdir mntfs
sudo mount -t squashfs -o loop mnt/casper/filesystem.squashfs mntfs

# ファイルシステムをコピー
# マウントした場所は書き換えできないので、コピーします。
mkdir squashfs
sudo rsync -P -a mntfs/ squashfs

# マウントは不要になったのでアンマウントします。
sudo umount mntfs
sudo umount mnt
rm -r mntfs mnt

# シンボリックリンクも不要なので削除します
rm image.iso

# リリースノートの URL を設定します。
echo $RELEASENOTE_URL | sudo tee disk/.disk/release_notes_url

# ディスク情報を設定します。
today=$(date +"%Y%m%d")
echo -n "MyDistribution 22.04 LTS \"Jammy Jellyfish\" - Release amd64 ($today)" | tee 
echo -n "MyDistribution 22.04 LTS \"Jammy Jellyfish\" - Release amd64 ($today)" | sudo tee disk/.disk/info

# インストーラーの言語を日本語に設定します。
cat | sudo tee -a disk/preseed/ubuntu.seed <<EOF
d-i debian-installer/language string ja
d-i debian-installer/locale string ja_JP.UTF-8
d-i keyboard-configuration/layoutcode string jp
d-i keyboard-configuration/modelcode jp106
d-i keyboard-configuration/layout select Japanese
d-i keyboard-configuration/variant select Japanese
EOF

# grub.cfg の日本語化
splash=$(echo "splash --- debian-installer/language=ja" \
"debian-installer/locale=ja_JP.UTF-8" \
"keyboard-configuration/layoutcode?=jp" \
"keyboard-configuration/modelcode?=pc105")
sudo sed -i "s#splash ---#$splash#" disk/boot/grub/grub.cfg
```

## カスタマイズするためのスクリプトの割り当て 
```bash
# MyDistribution.sh は Ubuntu をカスタマイズするスクリプトです。
chroot squashfs /bin/bash MyDistribution.sh
```

## ファイルシステムの作成
```bash
# パッケージ一覧を書き込み
sudo chroot squashfs/ dpkg-query -W --showformat='${binary:Package}\t${Version}\n' |\
tee disk/casper/filesystem.manifest

# ファイルシステムのサイズを書き込み
sudo du -B 1 -s squashfs/ | cut -f1 | sudo tee disk/casper/filesystem.size

# ファイルシステムのイメージ化
sudo mksquashfs squashfs/ disk/casper/filesystem.squashfs -xattrs -comp xz
sudo rm disk/casper/filesystem.squashfs.gpg

# md5sum.txt を出力
cd disk
find . -type f -not -name 'md5sum.txt' -not -path './boot/*' -not -path './EFI/*' -print0 | xargs -0 md5sum | sudo tee md5sum.txt
md5sum ./boot/memtest86+.bin | sudo tee -a md5sum.txt
md5sum ./boot/grub/*.cfg | sudo tee -a md5sum.txt
cd ..
```

## ディスクイメージの作成
```bash
VOLUME_ID="MyDistribution"
OUTPUT_ISO="mydistribution-22.04-desktop-amd64.iso"

xorriso \
    -as mkisofs  \
    -volid "$VOLUME_ID" \
    -o "$OUTPUT_ISO" \
    -J -joliet-long -l  \
    -b boot/grub/i386-pc/eltorito.img  \
    -no-emul-boot  \
    -boot-load-size 4  \
    -boot-info-table  \
    --grub2-boot-info  \
    --grub2-mbr /usr/share/cd-boot-images-amd64/images/boot/grub/i386-pc/boot_hybrid.img \
    -append_partition 2 0xef /usr/share/cd-boot-images-amd64/images/boot/grub/efi.img  \
    -appended_part_as_gpt  \
    --mbr-force-bootable  \
    -eltorito-alt-boot  \
    -e --interval:appended_partition_2:all::  \
    -no-emul-boot \
    -partition_offset 16 \
    -r \
    disk/
```

## QEMU で起動してみる
### QEMU をインストールしていない場合
```bash
sudo apt install -y qemu-system-x86
```

### LiveCD を起動する
```bash
sudo qemu-system-x86_64 -m 4G -cdrom mydistribution-22.04-desktop-amd64.iso -boot d --enable-kvm -usb -smp 6
```

### 仮想ディスクにインストールする場合
```bash
qemu-img create -f qcow2 disk.qcow2 32G
sudo qemu-system-x86_64 -hda disk.qcow2 -m 4G -cdrom mydistribution-22.04-desktop-amd64.iso -boot d --enable-kvm -usb -smp 6
```