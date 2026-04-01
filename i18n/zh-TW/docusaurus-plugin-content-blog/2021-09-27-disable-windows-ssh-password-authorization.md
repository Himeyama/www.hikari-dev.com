---
title: 在 Windows 上停用 OpenSSH 的密碼驗證
tags: [SSH]
date: '2021-09-27 05:21'
image: https://user-images.githubusercontent.com/39254183/134822852-3730bc9f-9f80-46c0-8615-c73b247bb3ce.png
---

## 開啟具有系統管理員權限的終端機
編輯設定檔需要系統管理員權限，請以系統管理員身份開啟終端機。

在終端機圖示上按右鍵，選擇「以系統管理員身份執行」。

![image](https://user-images.githubusercontent.com/39254183/134822852-3730bc9f-9f80-46c0-8615-c73b247bb3ce.png)

![image](https://user-images.githubusercontent.com/39254183/134822910-c52deecb-5dc0-465f-bf3c-e6bfb44e95b8.png)

## 在終端機中開啟設定檔
執行以下命令：

```sh
notepad C:\ProgramData\ssh\sshd_config
```

![image](https://user-images.githubusercontent.com/39254183/134822970-80874872-efad-4977-abfa-3daa23bea918.png)

## 編輯設定檔
```diff
- # PasswordAuthentication yes
+ PasswordAuthentication no
```

![image](https://user-images.githubusercontent.com/39254183/134823025-3abbd4e5-10a5-4f93-a1ca-b88d09a03065.png)

變更為

![image](https://user-images.githubusercontent.com/39254183/134823053-4b9ff060-ded4-42ec-adad-36c5ac252954.png)

並儲存變更。

## 重新啟動 SSH 伺服器
返回終端機，執行以下命令以重新啟動 SSH 伺服器：

```sh
Restart-Service sshd
```

## 連線測試
測試設定是否已生效。

執行以下命令，若看到以下訊息：

```sh
ssh localhost
user@localhost: Permission denied (publickey,keyboaard-interactive).
```

即表示設定正確。
