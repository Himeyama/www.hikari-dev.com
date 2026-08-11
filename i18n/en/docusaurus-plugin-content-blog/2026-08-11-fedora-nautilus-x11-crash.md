---
title: A GUI App Won't Launch Over SSH X11 Forwarding
authors: hikari
tags: [Linux, Windows, Fedora, SSH, ネットワーク]
image: /img/ogp/2026-08-11-fedora-nautilus-x11-crash.webp
---

Following [the previous post](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows), I set up an SSH X11 forwarding environment and `xeyes` displayed fine on the Windows side. But `nautilus` simply refused to launch. This is a record of tracking down why this one app kept crashing even though `DISPLAY` was clearly working.

{/* truncate */}

## Symptom

```
$ nautilus
** Message: 23:27:59.343: Connecting to org.freedesktop.Tracker3.Miner.Files
nautilus-application-Message: 23:27:59.344: Failed to initialize display server connection: Unsupported or missing session type 'tty'
libEGL warning: DRI3 error: Could not get DRI3 device
libEGL warning: Ensure your X server supports DRI3 to get accelerated rendering
Couldn't open libGLESv2.so.2: cannot open shared object file: No such file or directory
Aborted (core dumped)
```

Meanwhile, `xeyes` displayed on the Windows side from the same shell without any configuration changes. So X11 forwarding itself was confirmed to be working, yet the GNOME app alone was being rejected.

## Cause 1: xeyes and nautilus demand different things

`xclock` / `xlogo` / `xeyes` are classic Xlib apps that only need the `DISPLAY` variable and a TCP connection to the X server. That's all it takes for them to run.

`nautilus`, on the other hand, is a modern GTK app that's part of GNOME, and it demands more than a plain X11 connection.

| What it checks | What's being verified |
|---|---|
| Session type | Whether it's registered with `systemd-logind` as a "graphical session" |
| D-Bus / Tracker3 | Integration with the file-indexing service (the `Connecting to org.freedesktop.Tracker3.Miner.Files` line at the top of the log) |
| EGL/GLES | The GPU acceleration foundation used for rendering |

The `Unsupported or missing session type 'tty'` error message is exactly this. SSH's X11 forwarding (equivalent to `ssh -X`) does make `DISPLAY` usable, but as far as `loginctl` is concerned it remains a "tty session" and isn't recognized as a proper graphical session (x11/wayland). That's why nautilus refused to launch at this point.

### Workaround: fake the session type via environment variables

Touching `systemd-logind`'s own configuration (on the PAM side) has too broad a blast radius, so I tried a lighter workaround first.

```bash
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11 nautilus
```

This cleared the `Unsupported or missing session type 'tty'` error. Apparently GTK checks the environment variables before querying logind, so the environment variables alone were enough to get past this check.

## Cause 2: libGLESv2.so.2 doesn't exist on the system

Even after working around the session check, the process kept dying with exit code 134 (SIGABRT, core dump). The decisive line left in the log was this one.

```
Couldn't open libGLESv2.so.2: cannot open shared object file: No such file or directory
```

Forcing software rendering with `LIBGL_ALWAYS_SOFTWARE=1` didn't help either. This wasn't a "GPU isn't available" configuration problem — it was an installation problem where the library file simply didn't exist, so switching rendering modes was pointless no matter how many times I tried.

### Tracking it down: which package provides it

```bash
$ dnf provides '*/libGLESv2.so.2'
libglvnd-gles-1:1.7.0-8.fc43.x86_64 : GLES support for libglvnd
Repo         : fedora
Matched From :
Filename     : /usr/lib64/libGLESv2.so.2
```

[The previous post](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows) confirmed that `mesa-libGL` was already installed, but `libglvnd-gles` (the GLES compatibility layer) is a separate package that hadn't been installed. On Fedora 43, GL-related packages are split this finely, which makes it easy to overlook things under the assumption that "the mesa stuff should already be in place."

```bash
sudo dnf install -y libglvnd-gles
```

## Result

```bash
XDG_SESSION_TYPE=x11 GDK_BACKEND=x11 nautilus
```

The process now kept running without a core dump, and its window appeared on the Windows side. The only remaining log lines are the following warnings, which are not fatal.

```
libEGL warning: DRI3 error: Could not get DRI3 device
libEGL warning: Ensure your X server supports DRI3 to get accelerated rendering
```

Since GPU acceleration isn't available and it's falling back to software rendering, the app feels a bit sluggish, but it's perfectly usable in practice.

## Troubleshooting table (additions)

| Symptom | Cause | Fix |
|---|---|---|
| `xeyes` displays fine but the GNOME app alone shows `Unsupported or missing session type 'tty'` | The SSH tty session isn't recognized as a graphical session by logind | Launch with `XDG_SESSION_TYPE=x11 GDK_BACKEND=x11` |
| The session error disappears but the process still dies with "Aborted (core dumped)" | `Couldn't open libGLESv2.so.2` — the library itself isn't installed | Identify the providing package with `dnf provides '*/libGLESv2.so.2'` and install it (`libglvnd-gles`) |
| `LIBGL_ALWAYS_SOFTWARE=1` doesn't help | Unrelated — the issue isn't driver selection, it's a missing library file | Fix by installing the package, not by switching rendering modes |

## Summary

- Seeing `xeyes` work doesn't mean a GNOME app will work. Classic Xlib apps and modern GTK apps operate under completely different assumptions. Confirming X11 forwarding connectivity and confirming a GNOME app actually works should be treated as separate diagnostic steps.
- SSH's X11 forwarding only gets `DISPLAY` working — it doesn't change the session type as seen by `systemd-logind`. Apps like nautilus that check the session type can sometimes be pushed through with the `XDG_SESSION_TYPE=x11 GDK_BACKEND=x11` environment variables.
- A "library not found" error can't be solved by switching rendering modes (`LIBGL_ALWAYS_SOFTWARE` and the like). It's faster to identify the providing package with `dnf provides '*/<filename>'` and just install it.
- Fedora 43 splits mesa-related packages quite finely. Even if `mesa-libGL` is installed, `libglvnd-gles` (GLES support) is sometimes a separate requirement.
- It works, but X11 forwarding without GPU acceleration feels heavy to render. If you want something more comfortable, switching to the `xrdp` plus full-desktop setup mentioned at the end of [the previous post](/blog/2026/08/11/fedora-ssh-x11-forwarding-windows) is an option.
