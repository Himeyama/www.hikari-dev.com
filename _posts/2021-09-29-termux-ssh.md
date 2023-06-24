---
title: termux に ssh する
layout: default
date: '2021-09-29 05:11'
---

# OpenSSH のインストール

```bash
pkg install openssh
```

## エラーが出る場合

Android 版の termux で実行するとエラーが起こるので、
既存の termux を削除し Github から termux をインストールすることをおすすめします。([GitHub から Termux をインストールする](/2021/09/29/termux-install-github.html))


# サーバーの起動
```bash
sshd
```

# 公開鍵の設定
クライアントの公開鍵 (`~/.ssh/id_*.pub`) を
termux の `~/.ssh/authorized_keys` に追加する。

公開鍵はメールで自分宛てに送ったり、twitter の DM で自分宛てに送ったりして、コピペすると楽。

```sh
# 例:
echo ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKYztjZfIVMl5o0J2DrigTsl1XgbSKMUgYCpfOfhMtmw hikari@B450M-K >> ~/.ssh/authorized_keys
```

# ログイン
```bash
# スマホの ip アドレスを確認
ip a

ssh 192.168.x.x -p 8022
```

