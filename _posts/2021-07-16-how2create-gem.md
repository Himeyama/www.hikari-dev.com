---
title: gem 作り方
layout: post
date: '2021-07-16 01:54'
---


## テンプレートの作成
```sh
bundle gem <GEM 名> -t

cd narray-fromfile
```

## Gemspec の編集

0. `<GEM 名>.gemspec` を開く。
0. `spec.summary`、`spec.description`、`spec.homepage`、
を編集する
0. `spec.metadata["allowed_push_host"]` 
にホームページの URL を記述
0. `spec.homepage` に Gem のページを記述
0. `spec.metadata["source_code_uri"]` にリポジトリの URL を記述
0. `spec.metadata["changelog_uri"]` に `changelog.md` の URL を記述

最低限このくらい設定する。

## GitHub に push しインストール

```sh
git init
git add .
git commit -mFirst\ Commit
git remote add origin git@github.com:<ユーザー名>/<GEM 名>.git
git push -u origin master
```

### インストール

```sh
gem install specific_instal
gem specific_install -l "git://github.com/<ユーザー名>/<GEM 名>.git"
```

#### Gemfile
```rb
gem "<GEM 名>", github: "<ユーザー名>/<GEM 名>.git", branch: :main
```

