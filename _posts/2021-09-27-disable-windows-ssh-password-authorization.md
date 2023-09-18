---
title: Windows の OpenSSH でパスワード認証を無効にする
layout: post
date: '2021-09-27 05:21'
---

## 管理者権限でターミナルを開く
設定ファイルを編集するために管理者権限が必要なため、管理者権限でターミナルを開く。

ターミナルのアイコンを右クリックして、ターミナルを右クリックして、「管理者として実行」

![image](https://user-images.githubusercontent.com/39254183/134822852-3730bc9f-9f80-46c0-8615-c73b247bb3ce.png)

![image](https://user-images.githubusercontent.com/39254183/134822910-c52deecb-5dc0-465f-bf3c-e6bfb44e95b8.png)

## ターミナルで設定ファイルを開く

```sh
notepad C:\ProgramData\ssh\sshd_config
```

を実行。

![image](https://user-images.githubusercontent.com/39254183/134822970-80874872-efad-4977-abfa-3daa23bea918.png)


## 設定ファイルを編集

```diff
- # PasswordAuthentication yes
+ PasswordAuthentication no
```

![image](https://user-images.githubusercontent.com/39254183/134823025-3abbd4e5-10a5-4f93-a1ca-b88d09a03065.png)

を

![image](https://user-images.githubusercontent.com/39254183/134823053-4b9ff060-ded4-42ec-adad-36c5ac252954.png)

に変更し上書き保存する。

## SSH サーバーの再起動
ターミナルに戻り、以下のようにコマンドを実行し、SSH サーバーを再起動する。

```sh
Restart-Service sshd
```

## 接続テスト
設定が有効になっているかテストする。

```sh
ssh localhost
```

を実行し、

```sh
user@localhost: Permission denied (publickey,keyboard-interactive).
```

のようになっていれば OK

