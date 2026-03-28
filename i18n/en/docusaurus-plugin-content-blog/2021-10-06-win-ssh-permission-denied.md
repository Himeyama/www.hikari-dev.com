---
title: Windows OpenSSH Permission denied issue
tags: [SSH]
date: '2021-10-06 07:27'
image: https://user-images.githubusercontent.com/39254183/136111516-3059460f-1c9c-4168-9650-204017ed8419.png
---

# Situation
- Password login is possible (although disabled in the settings)
- `Permission denied` occurs when using public key authentication

When connecting to `localhost:22`, the following error occurs:

```ps1
hikari@localhost: Permission denied (publickey,keyboard-interactive).
```

![image](https://user-images.githubusercontent.com/39254183/136111516-3059460f-1c9c-4168-9650-204017ed8419.png)

# Cause
It appears that the `Administrators` group, i.e., "administrator users", is referencing the public key in `C:\ProgramData\ssh\administrators_authorized_keys` for authentication by default.

Change this to `$env:userprofile\.ssh\authorized_keys`.

# Solution

Open `C:\ProgramData\ssh\sshd_config` with administrator privileges and comment out the following two lines:

![image](https://user-images.githubusercontent.com/39254183/136111494-f63c3a56-5b5a-4c21-a7b5-a0a4b7e6249d.png)

```diff
- Match Group administrators
-       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
+ #Match Group administrators
+ #      AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

After saving, restart the service.

```ps1
Restart-Service sshd
```