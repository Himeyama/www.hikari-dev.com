---
title: Poetry を用いた Python プロジェクトの作成
layout: default
---

## 環境構築
Python と Poetry がインストール済みの場合は[スキップ](#python-プロジェクトの作成)

### pyenv と Python のインストール
**インストール済みの場合は[スキップ](#poetry-のインストール)**

参考: https://github.com/pyenv/pyenv-installer

```bash
# 依存パッケージのインストール
sudo apt update
sudo apt install make build-essential libssl-dev zlib1g-dev \
libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev

curl https://pyenv.run | bash
```

`~/.bashrc` にパスを通す
```bash title='.bashrc'
export PATH=$PATH:~/.pyenv/bin
eval "$(pyenv init --path)"
eval "$(pyenv virtualenv-init -)"
```

次に Python のインストールを行う。

```bash
# インストール可能なバージョン一覧を表示
pyenv install -l
# Python 3.10.2 をインストール
pyenv install 3.10.2

# バージョンの設定
pyenv global 3.10.2
# バージョンの確認
pyenv versions

```

### Poetry のインストール
**インストール済みの場合は[スキップ](#python-プロジェクトの作成)**

```sh
pip install --upgrade pip
pip install poetry
```

## Python プロジェクトの作成
### ひな形を作成
プロジェクト名を `myapp` として、Python プロジェクトを作成する。

```bash
poetry new myapp
```

`pyproject.toml` にプロジェクトの設定を記述する。

- ./
    - README.rst  
    - myapp/ (Python のコードがあるところ)
        - \__init__.py
    - pyproject.toml (プロジェクトの設定ファイル)
    - tests/ (テストコードがあるところ)
        - \__init__.py
        - test_myapp.py

`./` 上で `import myapp` すると、`myapp/__init__.py` が読み込まれる。

### プロジェクトに再利用可能な Python コードを追加

> 例: `myapp/` 下に `hoge.py` を作成する。

```diff
  .
  ├── README.rst
  ├── myapp
  │   ├── __init__.py
+ │   └── hoge.py
  ├── pyproject.toml
  └── tests
      ├── __init__.py
      └── test_myapp.py
  
  2 directories, 6 file
```

`./` 上で `from myapp import hoge` をすると、`hoge.py` が読み込まれる。

> 例: `hoge.py` の関数を利用する
```py title='myapp/hoge.py'
def hello():
    print('Hello, world!')
```

`./` 上で以下を実行すると、`hello()` を呼び出し可能。クラスも同様。
```py
>>> from myapp.hoge import hello
>>> hello()
Hello, world!
```

### パッケージの追加
依存するパッケージが必要な場合は、`poetry add` を実行する。
削除は `poetry remove`。

> 例: numpy を追加
```bash
poetry add numpy
```

### パッケージの作成
`myapp` パッケージを作成する。
プロジェクトをライブラリとしてインストール・利用が可能に。

```bash
poetry build
```

`dist/` 下に whell と tarball が作成される。

作成されたパッケージは pip コマンドでインストール可能。

```bash
pip install dist/myapp-0.1.0.tar.gz
```

### プロジェクトをパッケージとして配布
(後日、追記予定)


