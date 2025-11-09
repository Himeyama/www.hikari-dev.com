---
title: Disable Password Authentication in OpenSSH on Windows
layout: post
date: '2021-09-27 05:21'
authors: hikari
---

## Open an elevated terminal
You need administrator privileges to edit the configuration file, so open a terminal with administrator privileges.

Right-click on the terminal icon and select "Run as administrator".

![image](https://user-images.githubusercontent.com/39254183/134822852-3730bc9f-9f80-46c0-8615-c73b247bb3ce.png)

![image](https://user-images.githubusercontent.com/39254183/134822910-c52deecb-5dc0-465f-bf3c-e6bfb44e95b8.png)

## Open the configuration file in the terminal
Run the following command:

```sh
notepad C:\ProgramData\ssh\sshd_config
```

![image](https://user-images.githubusercontent.com/39254183/134822970-80874872-efad-4977-abfa-3daa23bea918.png)

## Edit the configuration file
```diff
- # PasswordAuthentication yes
+ PasswordAuthentication no
```

![image](https://user-images.githubusercontent.com/39254183/134823025-3abbd4e5-10a5-4f93-a1ca-b88d09a03065.png)

Change it to

![image](https://user-images.githubusercontent.com/39254183/134823053-4b9ff060-ded4-42ec-adad-36c5ac252954.png)

and save the changes.

## Restart the SSH server
Return to the terminal and run the following command to restart the SSH server:

```sh
Restart-Service sshd
```

## Connection test
Test if the configuration is enabled.

Run the following command and if you see:

```sh
ssh localhost
user@localhost: Permission denied (publickey,keyboaard-interactive).
```

Then it's OK.