---
title: Troubleshooting "Got bad result from install script." error in Visual Studio Code
date: '2021-12-14 04:08'
authors: hikari
---

# Overview
I tried to use SSH in VS Code, but encountered an error: `Got bad result from install script.` and I cannot connect.

The command prompt also does not launch.

# Solution
Opened the Registry Editor and cleared the value of `AutoRun` under `HKEY_CURRENT_USER\Software\Microsoft\Command Processor`.
