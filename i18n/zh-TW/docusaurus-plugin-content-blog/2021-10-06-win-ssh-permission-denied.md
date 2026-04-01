---
title: Windows OpenSSH Permission denied 問題
tags: [SSH]
date: '2021-10-06 07:27'
image: https://user-images.githubusercontent.com/39254183/136111516-3059460f-1c9c-4168-9650-204017ed8419.png
---

# 問題情況
- 可以使用密碼登入（雖然設定中已停用）
- 使用公鑰驗證時發生 `Permission denied`

連線至 `localhost:22` 時，出現以下錯誤：

```ps1
hikari@localhost: Permission denied (publickey,keyboard-interactive).
```

![image](https://user-images.githubusercontent.com/39254183/136111516-3059460f-1c9c-4168-9650-204017ed8419.png)

# 原因
`Administrators` 群組（即「系統管理員使用者」）預設會從 `C:\ProgramData\ssh\administrators_authorized_keys` 讀取公鑰進行驗證。

需要將其改為 `$env:userprofile\.ssh\authorized_keys`。

# 解決方法

以系統管理員權限開啟 `C:\ProgramData\ssh\sshd_config`，將以下兩行註解掉：

![image](https://user-images.githubusercontent.com/39254183/136111494-f63c3a56-5b5a-4c21-a7b5-a0a4b7e6249d.png)

```diff
- Match Group administrators
-       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
+ #Match Group administrators
+ #      AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

儲存後，重新啟動服務。

```ps1
Restart-Service sshd
```
