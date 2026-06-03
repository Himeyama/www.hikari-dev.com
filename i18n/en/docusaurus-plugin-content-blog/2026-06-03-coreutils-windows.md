---
title: "What is Coreutils for Windows"
authors: hikari
tags: [Windows]
draft: true
---

## Latest Trends in Microsoft’s Official Linux Command Set Installable with WinGet (Updated June 2026)

In June 2026, Microsoft officially released **Coreutils for Windows**.

```powershell
winget install Microsoft.Coreutils
```

The **Microsoft.Coreutils** package installed with this command is an official Microsoft project that enables UNIX-style commands commonly used on Linux and macOS—such as `ls`, `cp`, `rm`, and `cat`—to run natively on Windows.

This article summarizes the project overview, supported commands, limitations, and differences from WSL and PowerShell.

# Overview

Microsoft.Coreutils is a set of command-line tools for Windows maintained by Microsoft.

Internally, it is built on:

* uutils/coreutils
* findutils
* grep

and implemented in Rust.

Microsoft describes the project’s goal as:

> reducing friction for developers who move between Linux, macOS, WSL, containers, and Windows

# Installation

It can be installed easily from WinGet.

```powershell
winget install Microsoft.Coreutils
```

WinGet is the package manager built into Windows, and it can automatically download and install the specified package.

After installation, it can be used as ordinary commands.

```powershell
ls
cat file.txt
grep keyword log.txt
cp source.txt backup.txt
```

# Main Available Commands

Representative commands are as follows.

| Category     | Example Commands |
| -------- | ---------- |
| File listing | ls         |
| File copy    | cp         |
| File move    | mv         |
| File deletion | rm         |
| Display contents | cat     |
| Working directory | pwd     |
| Create directory | mkdir    |
| Sleep        | sleep      |
| Pipe processing | tee      |
| Search       | grep, find |

If you are a Linux user, you can use familiar commands as they are.

# PowerShell Collision Issues

This is the biggest point of caution!

PowerShell already has aliases and built-in commands with the same names.

Examples:

| Command | Issue |
| ---- | ------------------ |
| ls   | Conflicts with a PowerShell alias |
| cp   | Conflicts with Copy-Item |
| cat  | Conflicts with Get-Content |
| rm   | Conflicts with Remove-Item |
| pwd  | Conflicts with Get-Location |

Therefore, even if you run:

```powershell
ls
```

it does not necessarily invoke the Coreutils version.

Microsoft recommends using PowerShell 7.4 or later.

# Windows-Specific Limitations

Although it aims for Linux compatibility, there are limitations due to Windows internals.

## 1. No POSIX Signals

Linux’s mechanisms for:

```bash
kill
SIGTERM
SIGKILL
```

do not exist on Windows.

Therefore,

```bash
kill
timeout
```

are not provided at this time.

## 2. No /dev/null

Linux:

```bash
grep error log.txt > /dev/null
```

Windows:

```cmd
grep error log.txt > NUL
```

will be used instead.

## 3. Differences Between ACL and POSIX Permissions

Windows uses ACL-based permission management.

Therefore, commands such as:

```bash
chmod
chown
chgrp
```

are not provided.

---

## 4. Creating Symbolic Links

Reading is possible, but creating new ones requires:

* Developer Mode
* Administrator privileges

# Main Commands Not Provided

Microsoft intentionally excludes some commands.

### Those that conflict with Windows

* dir
* more
* paste
* whoami
* expand

### Those with strong POSIX dependencies

* chmod
* chown
* chgrp
* chroot
* nohup
* stty
* tty
* who

### Not yet implemented at this time

* kill
* timeout
* dd

# Differences from WSL

A common comparison is with WSL (Windows Subsystem for Linux).

| Item | Microsoft.Coreutils | WSL |
| ----------- | ------------------- | ------------ |
| Installation cost | Very low | Requires setting up a Linux environment |
| Startup speed | Native | Has a virtualized layer |
| Linux compatibility | Partial | Very high |
| Bash environment | None | Available |
| apt usage | Not possible | Possible |
| Shell script compatibility | Limited | High |

WSL is “Linux itself,” whereas Coreutils is “a toolset for using Linux-style commands on Windows.”