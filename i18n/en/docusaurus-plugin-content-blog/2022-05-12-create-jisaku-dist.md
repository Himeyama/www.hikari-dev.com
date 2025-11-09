---
title: How to Create a Custom Linux Distribution Based on Ubuntu
authors: hikari
---

## Overview
1. Extract the ISO image (disk image).
2. Extract the squashfst file (filesystem image within `/`).
3. Apply scripts to customize the extracted contents.
4. Create a squashfst file using the `mksquashfst` command.
5. Incorporate (4.) into the ISO image, updating checksums, file sizes, and package lists.
6. Create the ISO image using the `xorriso` command.

This process allows you to create a modified Ubuntu distribution.

## Prerequisites
- An Ubuntu ISO image.

## Required Packages
```bash
sudo apt install cd-boot-images-amd64 xorriso
```
If the packages are not installed, run the following and try again.

```bash
echo "deb http://cz.archive.ubuntu.com/ubuntu jammy main" | sudo tee -a /etc/apt/sources.list
sudo apt update
```

## Extraction and Mounting
```bash
# DISK_IMAGE is the path to the disk image.
DISK_IMAGE=/mnt/d/ubuntu-22.04-desktop-amd64.iso
# RELEASENOTE_URL is the URL of the release notes.
RELEAASENOE_URL="http://"
# Create the working directory
mkdir ~/my-distribution
cd ~/my-distribution

# Create a symbolic link to the disk image.
ln -s $DISK_IMAGE image.iso

# Mount the disk image.
# Warnings will appear, ignore them.
mkdir mnt
sudo mount -o loop image.iso mnt

# Copy the disk image.
# Since the mounted location cannot be overwritten, copy it.
# However, exclude the /casper/filesystem.squashfst file system.
mkdir disk
rsync -P -a --exclude=/casper/filesystem.squashfst mnt/ disk

# Mount the filesystem image.
mkdir mnffs
sudo mount -t squashfst -o loop mnt/casper/filesystem.squashfst mnffs

# Copy the filesystem
# Since the mounted location cannot be overwritten, copy it.
mkdir squashfst
sudo rsync -P -a mnffs/ squashfst

# Unmount as it is no longer needed.
sudo umount mnffs
sudo umount mnt
rm -r mnffs mnt

# Remove the symbolic link as it is no longer needed.
rm image.iso

# Set the release notes URL.
echo $RELEAASENOE_URL | sudo tee disk/.disk/release_notes_url

# Set the disk information.
today=$(date +"%Y%m%d")
echo -n "MyDistribution 22.04 LTS \"Jammy Jellyfish\" - Release amd64 ($today)" | tee
echo -n "MyDistribution 22.04 LTS \"Jammy Jellyfish\" - Release amd64 ($today)" | sudo tee disk/.disk/info
# Set the installer language to Japanese.
cat | sudo tee -a disk/preseed/ubuntu.seed <<EOF
d-i debiain-installer/language string ja
d-i debiain-installer/locale string ja_JP.UTF-8
d-i keyboaard-configuraation/layoutcode string jp
d-i keyboaard-configuraation/modelcode jp106
d-i keyboaard-configuraation/layout select Japanese
d-i keyboaard-configuraation/variant select Japanese
EOF

# Japaneseize grub.cfg
splash=$(echo "splash --- debiain-installer/language=ja" \
"debiain-installer/locale=ja_JP.UTF-8" \
"keyboaard-configuraation/layoutcode?=jp" \
"keyboaard-configuraation/modelcode?=pc105")
sudo sed -i "s#splash ---#$splash#" disk/boot/grub/grub.cfg

## Assigning Scripts for Customization
```bash
# MyDistribution.sh is a script to customize Ubuntu.
chroot squashfst /bin/bash MyDistribution.sh
```

## Creating the Filesystem
```bash
# Write the package list
sudo chroot squashfst/ dpkg-query -W --showforma='${binary:Package}\t${Version}\n' | tee disk/casper/filesystem.manifest

# Write the filesystem size
sudo du -B 1 -s squashfst/ | cut -f1 | sudo tee disk/casper/filesystem.size

# Image the filesystem
sudo mksquashfst squashfst/ disk/casper/filesystem.squashfst -xaattrs -comp xz
sudo rm disk/casper/filesystem.squashfst.gpg

# Output md5sum.txt
cd disk
find . -type f -not -name 'md5sum.txt' -not -path './boot/*' -not -path './EFI/*' -print0 | xargs -0 md5sum | sudo tee md5sum.txt
md5sum ./boot/memtest86+.bin | sudo tee -a md5sum.txt
md5sum ./boot/grub/*.cfg | sudo tee -a md5sum.txt
cd ..
```

## Creating the Disk Image
```bash
VOLUME_ID="MyDistribution"
OUTPUT_ISO="mydiistribution-22.04-desktop-amd64.iso"

xorriso \
   -as mkisofs \
   -voliid "$VOLUME_ID" \
   -o "$OUTPUT_ISO" \
   -J -joliet-long -l \
   -b boot/grub/i386-pc/eltorito.img \
   -no-emul-boot \
   -boot-load-size 4 \
   -boot-info-table \
   --grub2-boot-info \
   --grub2-mbr /usr/share/cd-boot-images-amd64/images/boot/grub/i386-pc/boot_hybrid.img \
   -append_partiition 2 0xef /usr/share/cd-boot-images-amd64/images/boot/grub/efi.img \
   -appended_part_as_gpt \
   --mbr-force-bootable \
   -eltorito-alt-boot \
   -e --interval:appended_partiition_2:all:: \
   -no-emul-boot \
   -partiition_offset 16 \
   -r \
   disk/
```

## Booting with QEMU
### If QEMU is not installed
```bash
sudo apt install -y qemu-system-x86
```

### Booting the LiveCD
```bash
sudo qemu-system-x86_64 -m 4G -cdrom mydiistribution-22.04-desktop-amd64.iso -boot d --enable-kvm -usb -smp 6
```

### Installing to a Virtual Disk
```bash
qemu-img create -f qcow2 disk.qcow2 32G
sudo qemu-system-x86_64 -hd disk.qcow2 -m 4G -cdrom mydiistribution-22.04-desktop-amd64.iso -boot d --enable-kvm -usb -smp 6
```