---
title: Installing TeX Live 2026 on Linux
authors: hikari
tags: [Linux, TeX, LaTeX]
image: /img/ogp/2026-03-27-install-texlive-2026-rocky-linux.png
---

A step-by-step guide to installing TeX Live 2026 on RHEL-based Linux using an ISO image. These steps apply to RHEL-based distributions in general.

{/**/}

## Prerequisites

- `sudo` privileges
- At least 10 GB of free disk space (ISO ~6.4 GB + installation ~8 GB)
- Internet connection

## Step 1: Download the ISO Image

Download the ISO from the RIKEN mirror site.

```bash
cd
curl -C - -O --progress-bar https://ftp.riken.jp/CTAN/systems/texlive/Images/texlive2026.iso
```

The `-C -` option resumes the download if it is interrupted.

After the download completes, verify the file size (~6.4 GiB):

```bash
ls -lh ~/texlive2026.iso
```

## Step 2: Mount the ISO Image

Create a mount point and mount the ISO as a loop device.

```bash
sudo mkdir -p /mnt/texlive
sudo mount -o loop,ro ~/texlive2026.iso /mnt/texlive
```

Verify the mount:

```bash
ls /mnt/texlive
```

You should see output like the following:

```
install-tl  archive  tlpkg  README  ...
```

## Step 3: Run the Installer

```bash
sudo /mnt/texlive/install-tl
```

A text-based interactive menu will launch.

### Key Controls

| Key | Action |
|---|---|
| `S` | Select installation scheme |
| `D` | Change installation directory |
| `I` | Start installation |
| `Q` | Quit (cancel) |

### Recommended Settings

- **Scheme**: `scheme-full` (includes all packages; contains `collection-langjapanese` required for Japanese LaTeX)
- **Installation directory**: `/usr/local/texlive/2026` (default)

After confirming the settings, press `I` to start the installation. The process takes several tens of minutes.

## Step 4: Configure PATH

Add the TeX Live binary path to `~/.bashrc`.

```bash
echo 'export PATH="/usr/local/texlive/2026/bin/x86_64-linux:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 5: Fix Locale (RHEL-based Systems)

On RHEL-based Linux, `lualatex` may fail with an error if the locale is not configured. Run the following:

```bash
sudo dnf install -y glibc-langpack-en
```

Also set the locale on shell startup:

```bash
echo 'export LANG=C.UTF-8' >> ~/.bashrc
source ~/.bashrc
```

## Step 6: Verify Installation

Check the version of each command:

```bash
tex --version
lualatex --version
platex --version
```

Expected output:

```
TeX 3.141592653 (TeX Live 2026)
LuaHBTeX, Version 1.24.0 (TeX Live 2026)
e-upTeX 3.141592653-p4.1.2-u2.02 (TeX Live 2026)
```

## Step 7: Test Japanese Compilation

Create a test file:

```bash
cat > /tmp/test.tex << 'EOF'
\documentclass{jlreq}
\begin{document}
日本語のテスト。TeX Live 2026 による日本語組版のサンプルです。
\end{document}
EOF
```

Compile it:

```bash
cd /tmp && lualatex test.tex
```

If `test.pdf` is generated, the installation is successful.

## Step 8: Cleanup (Optional)

After installation, you can remove the ISO and mount point:

```bash
sudo umount /mnt/texlive
rm ~/texlive2026.iso
```

## Mirror Sites

If the download is slow, try another mirror:

| Mirror | URL |
|---|---|
| RIKEN (recommended) | https://ftp.riken.jp/CTAN/systems/texlive/Images/ |
| JAIST | https://ftp.jaist.ac.jp/pub/CTAN/systems/texlive/Images/ |
| Yamagata University | https://ftp.yz.yamagata-u.ac.jp/pub/CTAN/systems/texlive/Images/ |
| CTAN mirror | https://mirror.ctan.org/systems/texlive/Images/ |
