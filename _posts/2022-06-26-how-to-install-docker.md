---
title: Ubuntu に Docker をインストールする
tags: [Ubuntu, Linux, Docker, 日本語訳]
layout: default
---

https://docs.docker.com/engine/install/ubuntu/#set-up-the-repository の日本語訳です。

:::important Docker Desktop for Linux
Docker Desktop を使用すると、Linux と同様に、
Mac と Windows 上でコンテナを簡単に構築、共有、実行できます。
Docker Desktop for Linux が一般提供版となったことをお伝えできることを嬉しく思います。
詳細については、[Docker Desktop for Linux](https://docs.docker.com/desktop/linux/install/)を参照してください。
:::

Ubuntu で Docker Engine を使い始めるには、
[前提条件](https://docs.docker.com/engine/install/ubuntu/#prerequisites)を満たしていることを確認してから、
[Docker をインストール](https://docs.docker.com/engine/install/ubuntu/#installation-methods)してください。

## 前提条件
### OS の要件
Docker Engine をインストールするには、
次のいずれかの Ubuntu バージョン (64 bit) が必要です。

- Ubuntu Jammy 22.04 (LTS)
- Ubuntu Impish 21.10
- Ubuntu Focal 20.04 (LTS)
- Ubuntu Bionic 18.04 (LTS)

Docker Engine は、`x86_64` (または `amd64`)、`armhf`、`arm64` 及び `s390x` アーキテクチャでサポートされています。

### 古いバージョンをアンインストールする
古いバージョンの Docker は docker、docker.io、docker-engine と呼ばれていました。
これらがインストールされている場合は、アンインストールします。

```bash
$ sudo apt-get remove docker docker-engine docker.io containerd runc
```

`apt-get` がこれらのパッケージのどれもインストールされていないと報告すれば問題ありません。

イメージ、コンテナ、ボリューム、ネットワークなどの `/var/lib/docker/` のコンテンツは保存されます。
既存のデータを保存する必要がなく、クリーンインストールから開始したい場合は、このページの下にある(Docker Engine のアンインストール](#)セクションを参照してください。

## インストール方法
Docker Engine は、必要に応じてさまざまな方法でインストールできます。

- インストールとアップグレードタスクを容易にするために、ほとんどのユーザは Docker の[リポジトリをセットアップ](#リポジトリを使用してインストールする)し、そこからインストールします。これは推奨されます。
- 一部のユーザは DEB パッケージをダウンロードして[手動でインストール](https://docs.docker.com/engine/install/ubuntu/#install-from-a-package)し、アップグレードを完全に手動で管理します。これは、インターネットにアクセスできないエアギャップのあるシステムに Docker をインストールする場合などに便利です。
- テストや開発環境では、自動化された便利なスクリプトを使って Docker をインストールするユーザもいます。

### リポジトリを使用してインストールする

Docker Engine を新しいホストマシンに初めてインストールする前に、Docker リポジトリをセットアップする必要があります。
その後、リポジトリから Docker をインストールして更新することができます。

#### リポジトリを設定する

1. `apt` パッケージインデックスを更新してパッケージをインストールし、`apt` が HTTPS 経由でリポジトリを使用できるようにします。
    ```bash
    $ sudo apt-get update

    $ sudo apt-get install \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    ```

2. Docker の公式 GPG キーを追加します。
    ```bash
    $ sudo mkdir -p /etc/apt/keyrings
    $ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    ```

3. リポジトリを設定するには、次のコマンドを使用します。
    ```bash
    $ echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

#### Docker エンジンのインストール

1. `apt` パッケージインデックスを更新し、*最新バージョン*の Docker Engine、containerd、Docker Compose をインストールするか、次のステップに進んで特定のバージョンをインストールします。
    ```bash
    $ sudo apt-get update
    $ sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin
    ```

    :::important `apt-get update` の実行時に GPG エラーが発生しますか？
    デフォルトの umask が正しく設定されていない可能性があります。
    これにより、リポジトリの公開鍵ファイルが検出されなくなります。次のコマンドを実行してリポジトリを再度更新してください。  
    `sudo chmod a+r /etc/apt/keyrings/docker.gpg`
    :::

2. Docker Engine の特定のバージョンをインストールするには、リポジトリにある利用可能なバージョンのリストから選択してインストールします。

    a. リポジトリで利用可能なバージョンをリストします。

    ```bash
    $ apt-cache madison docker-ce
    ```

    b. 2番目のカラムのバージョン文字列 (`5:20.10.16~3-0~ubuntu-jammy` など) を使用して特定のバージョンをインストールします。

    ```bash
    $ sudo apt-get install docker-ce=<VERSION_STRING> docker-ce-cli=<VERSION_STRING> containerd.io docker-compose-plugin
    ```

3. `hello-world` イメージを実行して、Docker Engine が正しくインストールされていることを確認します。
    ```bash
    $ sudo docker run hello-world
    ```

    このコマンドは、テスト・イメージをダウンロードし、コンテナ内で実行します。コンテナが実行されると、メッセージを出力して終了します。

Docker Engine がインストールされて実行されています。
`docker` グループは作成されますが、ユーザは追加されません。
Docker コマンドを実行するには `sudo` を使用する必要があります。
特権のないユーザが Docker コマンドを実行できるようにするには、[Linux の postinstall](https://docs.docker.com/engine/install/linux-postinstall/) を続行します。
その他のオプションの設定手順も実行できます。

#### Docker エンジンのアップグレード
Docker Engine をアップグレードするには、
まず `sudo apt-get update` を実行し、
[インストール手順](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)に従ってインストールする新しいバージョンを選択します。

### パッケージからインストールする
Docker のリポジトリを使用して Docker Engine をインストールできない場合は、
リリース用の `.deb`ファイルをダウンロードして手動でインストールすることができる。
Docker をアップグレードするたびに、新しいファイルをダウンロードする必要がある。

1. `https://download.docker.com/linux/ubuntu/dists/` に行き `Ubuntu` バージョンを選択して、`pool/stable/` をブラウズして `amd64`、`armhf`、`arm64`、または `s390x` を選択し、インストールしたい Docker Engine バージョンの `.deb` ファイルをダウンロードします。
2. Docker Engine をインストールし、以下のパスを Docker パッケージをダウンロードしたパスに変更します。
    ```bash
    $ sudo dpkg -i /path/to/package.deb
    ```
    Docker デーモンが自動的に起動します。
3. `hello-world` イメージを実行して、Docker Engine が正しくインストールされていることを確認します。
    ```bash
    $ sudo docker run hello-world
    ```
    このコマンドは、テスト・イメージをダウンロードし、コンテナ内で実行します。コンテナが実行されると、メッセージを出力して終了します。

Docker Engine がインストールされて実行されています。
`docker` グループは作成されますが、ユーザは追加されません。
`sudo` を使用してDockerコマンドを実行する必要があります。
特権のないユーザが Docker コマンドを実行できるようにするための [Linux のインストール後の手順](https://docs.docker.com/engine/install/linux-postinstall/)と、その他のオプションの設定手順に進みます。

#### Docker エンジンをアップグレードする
Docker Engine をアップグレードするには、新しいパッケージファイルをダウンロードし、新しいファイルを指定してインストール手順を繰り返します。

### 便利スクリプトを使用してインストールする
Docker は、[get.docker.com](https://get.docker.com/) で、
Docker を開発環境に迅速かつ非インタラクティブにインストールするための便利なスクリプトを提供しています。
便利なスクリプトはプロダクション環境には推奨されていませんが、
ユーザのニーズに合わせたプロビジョニングスクリプトを作成するための例として使用することができます。[パッケージリポジトリを使用してインストール](https://docs.docker.com/engine/install/ubuntu/#install-using-the-repository)するためのインストール手順については、リポジトリを使用したインストール手順も参照してください。
スクリプトのソースコードはオープンソースであり、
[GitHub の `docker-install` リポジトリ](https://github.com/docker/docker-install)にあります。

ローカルで実行する前に、インターネットからダウンロードしたスクリプトを必ず確認してください。
インストールする前に、便利スクリプトの潜在的なリスクと制限についてよく理解してください。

- スクリプトを実行するには、root 権限または sudo 権限が必要です。
- このスクリプトは、お使いの Linux ディストリビューションとバージョンを検出し、パッケージ管理システムを設定しようとするもので、ほとんどのインストール・パラメーターをカスタマイズすることはできません。
- スクリプトは、確認を求めることなく依存関係と推奨事項をインストールします。ホスト・マシンの現在の構成によっては、多数のパッケージがインストールされる場合があります。
- デフォルトでは、スクリプトは Docker、containerd、runc の最新安定リリースをインストールします。このスクリプトを使用してマシンをプロビジョニングすると、Docker の予期しないメジャーバージョンのアップグレードが発生する可能性があります。本番システムにデプロイする前に、テスト環境で (メジャー) アップグレードを必ずテストしてください。
- スクリプトは、既存の Docker インストールをアップグレードするようには設計されていません。スクリプトを使用して既存のインストールを更新する場合、依存関係が期待されたバージョンに更新されない可能性があり、古いバージョンが使用される原因となります。

:::important ヒント: 実行前にスクリプトステップをプレビューする
`DRY_RUN=1` オプションを指定してスクリプトを実行すると、インストール時にスクリプトが実行するステップを確認できます。

```bash
$ curl -fsSL https://get.docker.com -o get-docker.sh
$ DRY_RUN=1 sh ./get-docker.sh
```
:::

次の例では、[get.docker.com](https://get.docker.com/) からスクリプトをダウンロードして実行し、Dockerの最新の安定リリースをLinuxにインストールします。

```bash
$ curl -fsSL https://get.docker.com -o get-docker.sh
$ sudo sh get-docker.sh
```

Docker がインストールされている。Docker サービスは Debian ベースのディストリビューションで自動的に起動します。
CentOS、Fedora、RHEL、SLES などの RPM ベースのディストリビューションでは、
適切な systemctl または service コマンドを使用して手動で起動する必要があります。
メッセージが示すように、root 以外のユーザはデフォルトで Docker コマンドを実行できません。

:::important 非特権ユーザとして Docker を使用するか、ルートレスモードでインストールするには？
インストールスクリプトには、Docker をインストールして使用するために `root` 権限または `sudo` 権限が必要です。
root 以外のユーザに Docker へのアクセスを許可したい場合は、
[Linux のインストール後の手順](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user)を参照してください。
Docker は、`root` 権限なしでインストールすることも、
root なしモードで実行するように設定することもできます。
Docker を root なしモードで実行する方法については、
[root 以外のユーザとして Docker デーモンを実行する (root なしモード)](https://docs.docker.com/engine/security/rootless/)を参照してください。
:::

#### プレリリースをインストールする
Docker は [test.docker.com](https://test.docker.com/) で、Docker のプレリリースを Linux にインストールするための便利なスクリプトも提供しています。
このスクリプトは `get.docker.com` のスクリプトと同じですが、Docker の安定版とプレリリース (ベータバージョン、リリース候補) の両方を含むパッケージリポジトリから "test" チャネルを有効にするようにパッケージマネージャを設定します。
このスクリプトを使用して、新しいリリースに早期にアクセスし、安定版としてリリースされる前にテスト環境で評価します。

"test" チャネルから Linux に最新バージョンの Docker をインストールするには、次のコマンドを実行します。

```bash
$ curl -fsSL https://test.docker.com -o test-docker.sh
$ sudo sh test-docker.sh
```

#### 便利スクリプトを使用した後に Docker をアップグレードする
便利スクリプトを使用して Docker をインストールした場合は、
パッケージマネージャを直接使用して Docker をアップグレードする必要があります。
便利スクリプトを再実行するメリットはなく、
ホストマシンにすでに追加されているリポジトリを再追加しようとすると問題が発生する可能性があります。

## Docker Engine をアンインストールする
1. Docker Engine、CLI、Containerd、Docker Compose パッケージのアンインストール
    ```bash
    $ sudo apt-get purge docker-ce docker-ce-cli containerd.io docker-compose-plugin
    ```

2. ホスト上のイメージ、コンテナ、ボリュームまたはカスタマイズされた構成ファイルは、自動的には削除されません。すべてのイメージ、コンテナおよびボリュームを削除する手順は、次のとおりです。
    ```bash
    $ sudo rm -rf /var/lib/docker
    $ sudo rm -rf /var/lib/containerd
    ```

編集した設定ファイルは手動で削除する必要があります。

## 次のステップ

- [Linux のインストール後の手順](https://docs.docker.com/engine/install/linux-postinstall/)に進みます。
- [Docker を使った開発](https://docs.docker.com/develop/)のトピックを読んで、Docker を使って新しいアプリケーションを構築する方法を学んでください。
