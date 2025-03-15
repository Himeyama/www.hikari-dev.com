---
title: WSL2 で SSH のトンネルを使用して、WSL2 上のサーバーを LAN に公開する方法
layout: post
toc: true
---

## Step1. WSL 側に OpenSSH Server をインストール
WSL2 に OpenSSH Server をインストールします。
それと、sshd サービスを立ち上げます。

```bash
# WSL2 側
sudo apt install openssh-server
sudo service sshd start
```

## Step2. Windows 側で公開鍵を登録

Windows に公開鍵を登録していない場合は、以下のコマンドを実行します。

```ps1
# Windows 側
ssh-keygent -t ed25519
```

次に WSL2 に公開鍵を登録します。

```ps1
# Windows 側
$pubkey = $(cat $HOME\.ssh\id_ed25519.pub)
wsl -- echo $pubkey `| tee -a `$HOME/.ssh/authorized_keys
```

## Step3. SSH でトンネルを通す
Windows から WSL2 に対し、SSH 接続を行います。

```ps1
# Windows 側
ssh (wsl -- hostname -I).trim() -g -L8081:localhost:8080
```

コマンドを区切って説明します。

- `(wsl -- hostname -I).trim()` は WSL2 の IP アドレスを取得します
- `-g` はポートを LAN にフォワーディングします (外部の端末から 192.168.x.x のようなアドレスで参照可能になります)
- `-L` はローカルフォワードのオプションです。サーバーのポートをローカルに転送します
- `8081` と `localhost:8080` は ローカルの `8081` にアクセスすると、`localhost:8080` に転送されるという意味です。
    ここでいう `localhost` はサーバー側から見た `localhost` です

## Step4. サーバーを立ち上げる
公開対象となるサーバーを WSL2 上で立ち上げます。

```ps1
# WSL2 側
ruby -run -e httpd . # ディレクトリ一覧が公開される
```

## Step5. サーバーにアクセスする
`http://localhost:8081` または、`http://<ipconfig で表示される IP アドレス>:8081` でサービスにアクセスできます。

トンネル接続によるデメリットとしては毎回トンネルを通すのが面倒なことです。
不安定ですが、`netsh interface portproxy ~` による設定を行っても同じようにできます。
