---
title: Encrypting an NVMe SSD with LUKS2 and Enabling Automatic Unlock on Fedora-family AlmaLinux for Raspberry Pi
authors: hikari
tags: [Linux, AlmaLinux, Raspberry Pi, LUKS, セキュリティ]
image: /img/ogp/2026-09-21-almalinux-raspberry-pi-luks-auto-unlock.webp
---

On AlmaLinux 10.1 aarch64 running on Raspberry Pi 5, I encrypted the NVMe SSD's root partition with LUKS2 and configured it to skip passphrase entry at boot. `/boot`, which is read by the Raspberry Pi firmware, remains unencrypted, and the encrypted root is unlocked with a key in the initramfs.

{/* truncate */}

## Overall flow

I performed the work in the following flow.

![](/img/blog/2026-09-21-almalinux-raspberry-pi-luks-auto-unlock/luks2-migration-flow.svg)

## Final layout

The final disk layout is shown below. Device names and UUIDs have been replaced with example values so that the real environment cannot be identified.

```text
/dev/nvme0n1p1                         /boot (VFAT・暗号化なし)
/dev/nvme0n1p2                         LUKS2
  └─/dev/mapper/luks-<LUKS_UUID>       / (ext4)
```

The example values are listed below.

| Item | Example value |
|---|---|
| LUKS device | `/dev/nvme0n1p2` |
| LUKS UUID | `11111111-2222-3333-4444-555555555555` |
| Mapper name | `luks-11111111-2222-3333-4444-555555555555` |
| Root filesystem UUID | `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` |
| `/boot` UUID | `ABCD-1234` |

In an actual operation, always confirm the device names and UUIDs with the following commands.

```bash
lsblk -o NAME,SIZE,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS
sudo cryptsetup luksUUID /dev/nvme0n1p2
sudo blkid
```

## What is encrypted

This configuration does not encrypt the entire physical SSD. The NVMe root partition `/dev/nvme0n1p2` becomes a LUKS2 container, and the ext4 filesystem inside it is mounted as `/`. `/dev/nvme0n1p1`, used as `/boot`, remains VFAT.

This is because the Raspberry Pi firmware needs to read the boot files on `/boot` before Linux's initramfs starts. Therefore, data under `/` is encrypted, but the kernel, initramfs, configuration files, and automatic-unlock key stored under `/boot` are not encrypted.

The key is stored in the following two locations.

```text
/boot/.luks-root.key
/etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

`/boot/.luks-root.key` is the source key, and a copy on the root filesystem is embedded in the initramfs. `/boot` is mounted only after the root LUKS container has been unlocked, so the initramfs must not try to read `/boot/.luks-root.key` directly at early boot.

## Prerequisites

This article covers the process of converting an existing AlmaLinux root filesystem to LUKS2 without initializing it, confirming that it can boot with the normal passphrase, and then moving to automatic unlock.

- A backup from before encryption is available.
- `/boot` is an independent VFAT partition.
- A rescue environment is available that can unmount the root filesystem.
- The LUKS passphrase will be kept as a recovery method after encryption.

Do not convert a partition while it is being used as the running root filesystem. Use an external root, rescue system, or another OS from which the NVMe root can be unmounted reliably.

## Preparation before encryption

This section covers the preparation up to just before encrypting the existing NVMe root. Do not run the encryption command, register a LUKS key, or configure automatic unlocking in `crypttab` until these checks are complete.

### Disk layout before encryption

Before encryption, the NVMe root partition is mounted as a normal ext4 filesystem. Device names, sizes, and UUIDs in this article are examples and must be replaced with values collected immediately before the operation.

```text
/dev/nvme0n1                         NVMe SSD (約 240 GiB)
├─/dev/nvme0n1p1  vfat               /boot (約 512 MiB)
└─/dev/nvme0n1p2  ext4               / (root)
```

The encryption target is `/dev/nvme0n1p2`. `/dev/nvme0n1p1` is `/boot`, which is read by the Raspberry Pi firmware, so it must not be included in the operation.

If a USB SSD is used as the work environment, choose a label and capacity that make it clear that it is a different device from the NVMe SSD.

```text
/dev/sdb                            USB SSD (約 120 GiB)
├─/dev/sdb1        vfat             ALMA_BOOT /boot
└─/dev/sdb2        ext4             ALMA_ROOT /
```

`/dev/nvme0n1` and `/dev/sdb` are not fixed identifiers. Device names can change after a reboot or reconnect, so confirm the target using `MODEL`, `SERIAL`, `TRAN`, and the capacity together.

### Collect information first

Start by listing the device name, capacity, model, serial number, transport, filesystem, UUID, and mount points.

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS,TYPE
findmnt /
findmnt /boot
cat /proc/cmdline
```

Record the following values for the encryption target in a separate file.

- NVMe model and serial number
- Root partition device name
- Root filesystem UUID
- `/boot` UUID
- The device from which the current root is mounted

If `lsblk` is not enough to identify the layout, use these commands as well.

```bash
sudo blkid
sudo fdisk -l /dev/nvme0n1
```

### Back up the system and verify restoration

Encryption can fail because of a power loss, a device-name mix-up, an incorrect filesystem shrink size, or an initramfs configuration error. Before encrypting, save at least the following to media other than the NVMe SSD.

1. A file backup of user data
2. Important configuration such as `/etc`, `/home`, service settings, and SSH keys
3. The partition layout and UUID records
4. Boot media for recovery

Do not consider a backup complete based only on the copy command's exit status. Open important files, and confirm that the capacity and file count on the destination are reasonable.

The following is an example of a file-level copy. Replace `/mnt/alma-root/` with the root directory of the mounted USB SSD.

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

If `/home` is excluded, back up `/home` separately. Excluding it reduces the required capacity and time; it does not mean that the backup is complete.

`/dev`, `/proc`, `/sys`, and `/run` are pseudo-filesystems, so do not copy them as ordinary files. If you chroot from the rescue environment, bind-mount them later as needed.

### Prepare the USB SSD for use as a work disk

When reusing a USB SSD, confirm that the target is the USB SSD by its model, serial number, transport, and capacity before creating partitions. Partitioning and `mkfs` erase existing data, so never run them against the NVMe SSD.

The work-disk layout can be as follows.

```text
/dev/sdb1  1 GiB       FAT32  label=ALMA_BOOT
/dev/sdb2  残り全部    ext4   label=ALMA_ROOT
```

Check the target first.

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,MOUNTPOINTS
```

After confirming the target, create the filesystems and record their UUIDs and labels.

```bash
sudo mkfs.vfat -F 32 -n ALMA_BOOT /dev/sdb1
sudo mkfs.ext4 -L ALMA_ROOT /dev/sdb2
sudo blkid /dev/sdb1 /dev/sdb2
```

:::warning
`mkfs` erases data on the target partition. Do not rely only on the device name; confirm the model, serial number, and capacity with `lsblk` immediately beforehand.
:::

### Configure the USB SSD after copying

If the USB SSD is used as a bootable rescue environment, its `fstab` must refer to the USB UUIDs. Copying the NVMe UUIDs unchanged can cause the system to select the NVMe as root even when you intended to boot from USB.

```text
# USB 側の /etc/fstab
UUID=<USB_ROOT_UUID>  /     ext4  defaults,noatime 0 0
UUID=<USB_BOOT_UUID>  /boot vfat  defaults,noatime 0 0
```

The USB boot parameters must also use the USB root UUID.

```text
root=UUID=<USB_ROOT_UUID> rootfstype=ext4 rootwait
```

When generating the USB initramfs, mount the USB root at `/mnt/root`, bind-mount `/dev`, `/proc`, `/sys`, and `/run`, and generate it from the USB root. Do not confuse the root used for generation with the disk from which the system will boot.

### Verify USB boot

Before and after trying to boot from USB, confirm which disks provide root and `/boot`.

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,MOUNTPOINTS
findmnt /
cat /proc/cmdline
findmnt -no SOURCE,FSTYPE,TARGET /
findmnt -no SOURCE,FSTYPE,TARGET /boot
```

The expected result is that both root and `/boot` are on the USB SSD. If `/dev/nvme0n1p2` is shown as root, the system did not boot from USB.

### What the USB boot test showed

Linux being able to read a USB SSD and the Raspberry Pi firmware being able to boot from the same USB-SATA bridge are separate issues. With some USB-SATA bridges, the system can fall back to the NVMe even after trying the following.

- Connecting to a USB 3 port
- Switching the USB SSD between MBR and GPT
- Setting the boot flag
- Changing the EEPROM `BOOT_ORDER`
- Specifying the USB partition UUID
- Disabling UAS
- Configuring a USB startup delay

If direct USB boot is not possible, use a rescue environment with a proven boot path, such as another USB flash drive, another USB-SATA / NVMe enclosure, microSD, or network boot. Do not leave the NVMe root mounted while converting that same root in place.

### Checklist immediately before encryption

Confirm all of the following before running the encryption command.

```bash
lsblk -o NAME,PATH,SIZE,MODEL,SERIAL,TRAN,FSTYPE,LABEL,UUID,PARTUUID,MOUNTPOINTS
findmnt /
findmnt /boot
swapon --show
```

- The target is really the root partition.
- You confirmed that the `/boot` partition is not included in the encryption target.
- The USB SSD model, serial number, and capacity are as expected.
- The NVMe root is unmounted from the rescue environment.
- The copy on the USB side can be read.
- The backup destination is not the NVMe SSD itself.
- The environment is protected from power loss.
- A separate medium is available for the LUKS header backup.
- You confirmed that you will not use `luksFormat`, which erases existing data.
- You confirmed that the USB device and power will not be disconnected during encryption.

Once these checks are complete, proceed to the LUKS2 encryption command. After encryption, check the LUKS UUID, internal ext4 UUID, `crypttab`, `fstab`, initramfs, and boot parameters separately.

### Keep a work log

Record the commands used, UUIDs, partition layout, boot logs, and failed attempts. The following information is especially useful when investigating a boot failure later.

- Output from `lsblk`
- Output from `blkid`
- `/etc/fstab`
- `/etc/crypttab`
- `/boot/cmdline.txt`
- `/boot/config.txt`
- `journalctl -b -k`
- Raspberry Pi EEPROM settings

## Encrypt the root partition with LUKS2

To migrate an existing ext4 filesystem in place while preserving its data, use `cryptsetup reencrypt --encrypt` rather than `luksFormat`. `luksFormat` destroys the data on the target device.

The overall migration flow is as follows.

1. Identify the target device with `lsblk` and `blkid`, and confirm the backup.
2. Check the offline ext4 filesystem and create room for the LUKS header.
3. Convert it with `cryptsetup reencrypt --encrypt --type luks2`.
4. Update the UUIDs in `crypttab`, `fstab`, and `cmdline.txt`.
5. Regenerate the initramfs and apply the changes to the initramfs actually used for booting.
6. After rebooting, verify the mapper, root, and `/boot` mount status.

### Shrink ext4 to make room

For example, shrink the offline root filesystem before conversion. Choose the post-shrink size only after checking the used space and the backup.

```bash
sudo e2fsck -f /dev/nvme0n1p2
sudo resize2fs /dev/nvme0n1p2 <安全な縮小後サイズ>
```

### Convert in place to LUKS2

Use `cryptsetup reencrypt --encrypt` to preserve the existing data during conversion rather than `luksFormat`.

```bash
sudo cryptsetup reencrypt \
  --encrypt \
  --type luks2 \
  --reduce-device-size 32M \
  /dev/nvme0n1p2
```

Do not cut power, force a reboot, or disconnect the storage during this process. After it completes, check the LUKS UUID and header.

```bash
sudo cryptsetup luksUUID /dev/nvme0n1p2
sudo cryptsetup luksDump /dev/nvme0n1p2
```

The LUKS UUID shown here and the ext4 UUID inside the LUKS container are different. Use the former in `crypttab` and the latter for `/` in `fstab`.

## Boot settings after migration

After the LUKS2 migration, set the root filesystem UUID and `/boot` UUID in `fstab`. Replace the mapper name and UUIDs with the values from the actual environment.

```text
# /etc/fstab
UUID=<ROOT_UUID>  /     ext4  defaults,noatime 0 0
UUID=<BOOT_UUID>  /boot vfat  defaults,noatime 0 0
```

In `cmdline.txt` on the boot partition, specify at least the LUKS UUID and root filesystem UUID.

```text
rd.luks.uuid=<LUKS_UUID> root=UUID=<ROOT_UUID> rootfstype=ext4 rootwait
```

First confirm that the system boots with the normal passphrase. Then add the automatic-unlock key and update the initramfs.

### Regenerate the initramfs

From the rescue environment, mount the encrypted root and regenerate the initramfs inside `chroot`. Replace the device and mapper names with the values from the actual environment.

```bash
sudo mount /dev/mapper/luks-<LUKS_UUID> /mnt/root
sudo mount /dev/nvme0n1p1 /mnt/root/boot
sudo mount --rbind /dev  /mnt/root/dev
sudo mount --rbind /proc /mnt/root/proc
sudo mount --rbind /sys  /mnt/root/sys
sudo mount --rbind /run  /mnt/root/run

sudo chroot /mnt/root dracut --regenerate-all --force --no-hostonly
```

On an AlmaLinux Raspberry Pi setup using `auto_initramfs=1`, the fixed-name `/boot/initramfs8` must also be updated afterward. If this is forgotten, the LUKS settings may be present in the versioned initramfs while boot still uses the old file.

## Automatically unlock the encrypted root

The automatic-unlock flow is as follows.

1. Create a random key at `/boot/.luks-root.key`.
2. Register the key as an additional LUKS key.
3. Copy the same key to `/etc/cryptsetup-keys.d/`.
4. Make `crypttab` refer to the key under `/etc/cryptsetup-keys.d/`.
5. Regenerate the initramfs so that it contains the key and `crypttab`.
6. Apply the same contents to the initramfs that the Raspberry Pi actually boots.

The important point is not to make the initramfs read the original key directly from `/boot`. `/boot` is not mounted yet when the root LUKS container is being unlocked.

## Run the automatic-unlock setup script

Run the prepared setup script as root. In this article, the script is placed at `/usr/local/sbin/setup-luks-boot-key.sh`.

```bash
sudo /usr/local/sbin/setup-luks-boot-key.sh
```

The script performs the following operations in order.

- Create or reuse `/boot/.luks-root.key`.
- Add the key using the existing LUKS passphrase.
- Copy the same key to `/etc/cryptsetup-keys.d/`.
- Update `crypttab` to a key path readable from the initramfs.
- Regenerate the initramfs for all kernels.
- Update `/boot/initramfs8`, which is used by the Raspberry Pi.
- Verify that the key unlocks LUKS and that the initramfs contains the matching key.

If a key file already exists, never overwrite it with a new random key. Verify that the key is already registered with LUKS and reuse the same file.

### Passing the passphrase through an environment variable

If the first key-registration step should not prompt interactively, enter the passphrase without writing it directly in the command line or shell history.

```bash
read -rsp 'LUKS passphrase: ' LUKS_PASSPHRASE; echo
export LUKS_PASSPHRASE
sudo --preserve-env=LUKS_PASSPHRASE \
  /usr/local/sbin/setup-luks-boot-key.sh
unset LUKS_PASSPHRASE
```

The argument to `--preserve-env` is the environment variable name `LUKS_PASSPHRASE`, not the passphrase itself. Remove the variable with `unset` when the work is complete.

## Check `crypttab`

After configuration, `/etc/crypttab` refers to `/etc/cryptsetup-keys.d/`, not `/boot`.

```text
luks-<LUKS_UUID> UUID=<LUKS_UUID> /etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key luks
```

An example with the placeholder values expanded is shown below.

```text
luks-11111111-2222-3333-4444-555555555555 UUID=11111111-2222-3333-4444-555555555555 /etc/cryptsetup-keys.d/luks-11111111-2222-3333-4444-555555555555.key luks
```

The following configuration directly references `/boot/.luks-root.key` and cannot be used at early boot.

```text
# 起動初期の鍵としては不適切
luks-<LUKS_UUID> UUID=<LUKS_UUID> /boot/.luks-root.key luks
```

## Check the initramfs

Check both the versioned initramfs and the fixed-name initramfs that the Raspberry Pi actually reads.

```bash
sudo lsinitrd /boot/initramfs8 etc/crypttab
sudo lsinitrd /boot/initramfs8 \
  etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

Both `crypttab` and the key file should appear as follows.

```text
etc/crypttab
etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key
```

Checking only the versioned initramfs may not be enough.

```bash
# これだけでは、実際のブート対象を確認できない場合がある
sudo lsinitrd /boot/initramfs-$(uname -r).img

# auto_initramfs=1 の構成で実際に使われるファイル
sudo lsinitrd /boot/initramfs8
```

## Raspberry Pi-specific notes

If `/boot/config.txt` contains the following setting, the firmware uses the fixed-name `/boot/initramfs8`.

```text
auto_initramfs=1
```

With only `dracut --regenerate-all --force`, the versioned `initramfs-<kernel>.img` may be updated while `initramfs8` remains old. In that case, the key may be present in the versioned initramfs but the old `initramfs8` is used at boot.

After updating, check the following in order.

1. Confirm that `dracut` generated the versioned initramfs.
2. Confirm that `initramfs8` was updated.
3. Run `lsinitrd /boot/initramfs8` and check `crypttab` and the key file.
4. Reboot and confirm that no passphrase is requested.

## Test before rebooting

Before rebooting, verify that LUKS can be unlocked with the same key that will be embedded in the initramfs.

```bash
sudo cryptsetup open --test-passphrase \
  --key-file=/etc/cryptsetup-keys.d/luks-<LUKS_UUID>.key \
  /dev/nvme0n1p2 luks-key-test
```

If it succeeds, reboot.

```bash
sudo systemctl reboot
```

After rebooting, verify that root is mounted from the intended mapper.

```bash
findmnt -no SOURCE,FSTYPE,TARGET /
sudo cryptsetup status luks-<LUKS_UUID>
journalctl -b --no-pager | grep -E 'systemd-cryptsetup|cryptsetup'
```

The expected state is `/` mounted from `/dev/mapper/luks-<LUKS_UUID>` and `/boot` mounted from `/dev/nvme0n1p1`.

## Common failure points

### Referencing `/boot/.luks-root.key` directly from `crypttab`

Even if the key exists inside the initramfs, `/boot` is mounted only after the root has been unlocked. `systemd-cryptsetup` may fail to read the key and fall back to asking for the passphrase.

Use the copy under `/etc/cryptsetup-keys.d/` from both `crypttab` and the initramfs.

### Checking only the versioned initramfs

If the actual boot file is `initramfs8`, having the key in `initramfs-$(uname -r).img` is not enough. Always check `/boot/initramfs8` according to the boot configuration.

### Overwriting the key file

If an existing key has already been registered with LUKS, recreating the key file causes a mismatch between the initramfs and LUKS. Do not overwrite the existing file; confirm that it can still be used with `cryptsetup open --test-passphrase`.

### Confusing the LUKS UUID with the root UUID

The LUKS UUID identifies the encrypted container, while the root UUID identifies the ext4 filesystem inside it. Use different UUIDs in `crypttab`, `fstab`, and the kernel parameters.

### Destroying existing data with `luksFormat`

Do not use `luksFormat` when the existing data must be preserved. Confirm the target device before starting, and make sure that the encrypted-state backup can restore the system.

## Security implications

This configuration leaves `/boot` unencrypted. Anyone who physically obtains the SSD can acquire the key file on `/boot` and the key inside the initramfs, so it does not provide the same protection as a configuration that requires a LUKS passphrase.

In other words, this approach prioritizes convenience during reboot over the strength of at-rest encryption. It can be suitable for a home server where physical access is controlled separately, but it should not be treated as the primary protection against theft.

At a minimum, take the following measures.

- Set the key-file permissions to `600`.
- Keep the existing LUKS passphrase as a recovery method.
- Store a LUKS header backup on secure media separate from the SSD.
- Do not record the passphrase or key in the article, repository, or shell history.

Back up the LUKS header as follows. Store the backup somewhere other than the encrypted SSD.

```bash
sudo cryptsetup luksHeaderBackup /dev/nvme0n1p2 \
  --header-backup-file /path/to/secure/luks-header-backup.img
```

If migrating later to hardware protection such as TPM2, register the TPM2 key in the same LUKS container, verify reboot and recovery, and only then remove the `/boot` key.

## Summary

- Encrypt the NVMe SSD's root partition with LUKS2, while leaving `/boot` unencrypted for the Raspberry Pi boot process.
- Put the key for automatically unlocking the encrypted root into the initramfs through `/etc/cryptsetup-keys.d/`, not by referencing `/boot` directly.
- When `auto_initramfs=1` is enabled, update `/boot/initramfs8` as well as the versioned initramfs.
- Manage the LUKS UUID and the ext4 root UUID separately.
- Leaving the key on `/boot` prioritizes convenience and is not a defense against physical theft.

With this configuration, the system boots without asking for a passphrase in normal use. Keeping the original passphrase and a LUKS header backup still makes it possible to recover if the key file or initramfs is damaged.
