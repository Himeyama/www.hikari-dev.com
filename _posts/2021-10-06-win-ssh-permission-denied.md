---
title: Windows の OpenSSH で Permission denied が出る原因
layout: default
date: '2021-10-06 07:27'
---


# 状況
- パスワードでのログインは可能 (ただし、設定で無効化している)
- 公開鍵認証で `Permission denied` が出る

実際に `localhost:22` に接続すると、

```ps1
hikari@localhost: Permission denied (publickey,keyboard-interactive).
```

とエラーが出る。

![image](https://user-images.githubusercontent.com/39254183/136111516-3059460f-1c9c-4168-9650-204017ed8419.png)


# 原因
`Administrators` グループ、つまり「管理者ユーザー」はデフォルトで、`C:\ProgramData\ssh\administrators_authorized_keys` の公開鍵を
参照して認証しているようだ。

これを、`$env:userprofile\.ssh\authorized_keys` に変更する。

# 解決法

管理者権限で `C:\ProgramData\ssh\sshd_config` を開き、以下のように下の二行をコメントする。

![image](https://user-images.githubusercontent.com/39254183/136111494-f63c3a56-5b5a-4c21-a7b5-a0a4b7e6249d.png)

```diff
- Match Group administrators
-        AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
+ #Match Group administrators
+ #       AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
```

保存が終わったら、サービスを再起動する。

```ps1
Restart-Service sshd
```
