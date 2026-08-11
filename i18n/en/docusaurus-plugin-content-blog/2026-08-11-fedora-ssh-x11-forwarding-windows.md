---
title: From Fedora to Windows, Forwarding Only GUI Apps over SSH
authors: hikari
tags: [Linux, Windows, Fedora, SSH, ネットワーク]
image: /img/ogp/2026-08-11-fedora-ssh-x11-forwarding-windows.webp
---

The Fedora 43 Server had neither an X server nor a desktop environment installed. From there, GUI apps needed to be displayed on a Windows machine. This is a record of setting up SSH X11 forwarding to forward only individual apps, without installing a desktop environment.

{/* truncate */}

## A misconception to clear up first: GNOME Shell cannot be forwarded over X11

The natural instinct when thinking "install GNOME and forward it over SSH" is to reach for `dnf group install gnome-desktop`. But this rests on a mistaken premise.

**GNOME Shell is a Wayland compositor, and it cannot be forwarded through SSH's X11 forwarding.** X11 forwarding can only carry individual applications that run as X11 clients — not the desktop environment itself.

So the setup diverges completely depending on the goal.

| What you want | Technology | What the server needs |
|---|---|---|
| Forward individual GUI apps | SSH X11 forwarding | Only the GUI **app** (no X server needed) |
| Use the full desktop | xrdp + RDP | Full GNOME + Xorg + xrdp |

This time it's the former. Since **the X server runs on the Windows side**, the Fedora side doesn't need `Xorg` (`@base-x`), `gnome-shell`, or `gdm`. Not adding any resident services to the server was the biggest advantage of this setup.

## Environment

- Fedora Linux 43 (Server Edition) / `systemctl get-default` = `multi-user.target`
- SELinux Enforcing
- Client is a Windows machine on the same LAN

### What was already in place (no work needed)

Checking beforehand, the following was already present on a stock Fedora Server. Surveying this first makes it easy to gauge how much work is left.

| Prerequisite | Status |
|---|---|
| `xorg-x11-xauth` | Already installed (a hard requirement for X11 forwarding) |
| Japanese fonts (Noto CJK, `langpacks-fonts-ja`) | Already installed |
| `dbus-broker` + user session bus `/run/user/1000/bus` | Running (needed to launch GNOME apps) |
| `mesa-libGL` / `mesa-dri-drivers` | Already installed |

Having `xorg-x11-xauth` installed from the start matters a lot. Without it, X11 forwarding can't distribute authentication cookies, so `DISPLAY` never gets set even after `ssh -X`.

## Step 1: Check sshd's X11 forwarding settings

First check the effective values currently in force. Rather than reading the config file, checking with `sshd -T` for "what's actually in effect" is more reliable (requires root).

```bash
sudo sshd -T | grep -iE 'x11|allowtcpforwarding'
```

Result:

```
x11displayoffset 10
x11maxdisplays 1000
x11forwarding yes
x11uselocalhost yes
allowtcpforwarding yes
```

**Fedora 43 has `x11forwarding yes` by default.** So this step needed no changes. `x11uselocalhost yes` is also the safe-side setting that only listens on loopback, so it can stay as-is.

If `x11forwarding no` had been the case, a drop-in should be placed without touching `/etc/ssh/sshd_config` itself (Fedora's sshd_config includes `Include /etc/ssh/sshd_config.d/*.conf` at the top).

```bash
sudo tee /etc/ssh/sshd_config.d/10-x11-forwarding.conf >/dev/null <<'EOF'
X11Forwarding yes
X11UseLocalhost yes
X11DisplayOffset 10
EOF

sudo sshd -t && sudo systemctl reload sshd
```

:::note
No firewall or SELinux changes are needed. X11 forwarding just tunnels through port 22 and doesn't open a new port, and it's already permitted under the standard `sshd_t` policy.
:::

## Step 2: Install GUI apps and diagnostic tools

```bash
sudo dnf install nautilus gnome-text-editor gnome-system-monitor loupe xterm xeyes xdpyinfo
```

- `nautilus` — file manager
- `gnome-text-editor` — the default text editor
- `gnome-system-monitor` — system monitor
- `loupe` — image viewer (Fedora 43's default; `eog` is the older generation)
- `xterm` / `xeyes` / `xdpyinfo` — for connectivity checks

### Note: `xorg-x11-apps` is split up in Fedora 43

`xeyes` is the classic go-to for checking X11 forwarding, but **the `xorg-x11-apps` package no longer exists in Fedora 43**. `xeyes` and `xdpyinfo` are now split into their own individual packages, so they need to be specified separately.

```
xeyes-1.3.0-6.fc43.x86_64    : A follow the mouse X demo
xdpyinfo-1.3.4-3.fc43.x86_64 : X11 display information utility
```

Since these have shallower dependencies than the GNOME apps, they're useful for narrowing down whether X forwarding itself is broken, or whether the problem lies with the GNOME apps.

In practice, installation came to about 44 packages / 125 MiB. This modest footprint comes from not installing a desktop environment, helped by the fact that GTK4 and the glib stack were already present.

## Step 3: Set up an X server on Windows

Use **VcXsrv**. The `XLaunch` settings are as follows.

- Display settings: **Multiple windows** (each app gets its own independent window)
- Display number: **0**
- Client startup: **Start no client**
- Extra settings: turn on **Clipboard** and **Primary Selection**, and turn **Native opengl** **off**
- Leave "Disable access control" off at first and try it
- On the firewall dialog, allow **private network only**

Turning off `Native opengl` is the key point. Leaving it on tends to make GNOME apps crash around GLX.

Saving the configuration as `config.xlaunch` allows one-click launching next time.

Next, tell the Windows OpenSSH client where the X server is.

```powershell
setx DISPLAY "localhost:0.0"
```

`setx` doesn't take effect in the current session, so **reopen the terminal**.

## Step 4: SSH client-side configuration

Writing this into `%USERPROFILE%\.ssh\config` saves having to add the options every time.

```
Host fedora
    HostName 192.0.2.20
    User hikari
    ForwardX11 yes
    ForwardX11Trusted yes
```

### Why `ForwardX11Trusted yes` is set

The Windows OpenSSH client **doesn't ship with `xauth`**. Because of this, untrusted `-X` forwarding can fail to generate an authentication cookie, causing the GUI not to appear. Switching to trusted forwarding (equivalent to `-Y`) avoids this.

However, trusted forwarding means the forwarded app has unrestricted access to the local X server (it could snoop keystrokes typed into other windows). This is acceptable here because the other end is one's own VM on the LAN — **do not use it with untrusted hosts**.

## Step 5: Verify connectivity

With XLaunch running, run `ssh fedora` and check things in order from the shallowest dependency upward. This ordering itself is the diagnostic process.

```bash
# 1. Was DISPLAY set automatically? (should be something like localhost:10.0)
echo $DISPLAY

# 2. Was the auth cookie distributed? (there should be a line matching the same number as $DISPLAY)
xauth list

# 3. Can the X server be reached?
xdpyinfo | head -20

# 4. Rendering check — if a window appears on Windows, forwarding succeeded
xeyes
xterm

# 5. Check the GNOME apps
gnome-text-editor
nautilus
gnome-system-monitor
```

`DISPLAY` being `localhost:10.0` comes from sshd's `X11DisplayOffset 10`. It's a two-stage setup: the server side's `:10` travels through the tunnel and arrives at `:0` on the Windows side.

### Troubleshooting table

| Symptom | Cause |
|---|---|
| `echo $DISPLAY` is empty | Either the sshd-side setting, or the Windows-side `DISPLAY` environment variable hasn't taken effect |
| `xdpyinfo` says `unable to open display` | The X server on Windows isn't running, or it's being blocked by the firewall |
| `xeyes` appears but GNOME apps don't | A D-Bus or font issue. Run in the foreground and check the error output |
| `Authorization required, but no authorization protocol specified` | Relaunch XLaunch with "Disable access control" turned on |
| Japanese text shows as tofu (□) | Check the fonts with `fc-list :lang=ja \| head` |

## Confirming impact on the server

Checked whether anything unnecessary had been added after the install.

The dependencies included **`wsdd`** (a Windows network discovery daemon, pulled in via gvfs's SMB integration), which was a concern, but

```bash
systemctl is-enabled wsdd   # → disabled
systemctl is-active wsdd    # → inactive
```

it was disabled by default, so no action was needed. Also checked for new resident services and listening ports:

- New resident services started: **none**
- New listening ports: **none** (22 / 6443 / 53 etc., unchanged)

`systemctl get-default` also remained `multi-user.target`. This landed exactly as intended for a setup that avoids installing a desktop environment.

## Known limitations

- **Avoid `gnome-terminal` / `ptyxis`.** These are designed to share a single server process (`*-server`) via D-Bus activation, which gets pinned to the `DISPLAY` from the first time it was launched. Reconnecting via SSH won't follow the new `DISPLAY`, and windows may fail to appear. **Use `xterm`** for the forwarded terminal — it's reliable.
- **Rendering performance.** Lightweight apps are practical over a LAN, but scrolling and video are slow. Note that `ssh -C` (compression) tends to be counterproductive on a LAN, so it wasn't used.
- **3D/GL.** Hardware acceleration doesn't work; it falls back to indirect GLX or software rendering. If an app that uses GL crashes, try `LIBGL_ALWAYS_INDIRECT=1`.

## Summary

- **GNOME Shell cannot be forwarded over X11.** Only individual apps can be forwarded. Understanding this up front avoids needlessly installing a desktop environment.
- Since the X server runs on the Windows side, **the server doesn't need Xorg or a desktop environment at all**. This time it came to about 44 packages / 125 MiB, with no new resident services or listening ports.
- **Fedora 43's sshd has X11 forwarding enabled by default.** Checking the effective value first with `sudo sshd -T | grep -i x11` avoids unnecessary configuration changes.
- In Fedora 43, **`xorg-x11-apps` has been split into individual packages**. `xeyes` and `xdpyinfo` need to be specified separately.
- Since Windows OpenSSH lacks `xauth`, **`ForwardX11Trusted yes`** is effectively required. Use it only with hosts you trust.

If a full desktop ends up being wanted, the setup could switch to installing `xrdp` + `xorgxrdp` + GNOME and connecting with Windows' standard Remote Desktop client. In that case, opening 3389/tcp in firewalld would additionally be required.

There was a case where `xeyes` displayed fine but `nautilus` alone simply refused to launch. That investigation is covered in [the follow-up post](/blog/2026/08/11/fedora-nautilus-x11-crash).
