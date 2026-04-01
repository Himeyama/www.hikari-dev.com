---
title: 如何建立 gem
tags: [Ruby]
date: '2021-07-16 01:54'
image: /img/ogp/2021-07-16-how2create-gem.png
---

## 建立模板
```sh
bundle gem <GEM Name> -t
cd <GEM Name>
```

## 編輯 Gemspec
0. 開啟 `<GEM Name>.gemspec`。
0. 編輯 `spec.summary`、`spec.description`、`spec.homepage`，
0. 將首頁 URL 寫入 `spec.metadata["allowed_push_host"]`
0. 將 Gem 的頁面寫入 `spec.homepage`
0. 將儲存庫 URL 寫入 `spec.metadata["source_code_uri"]`
0. 將 `changelog.md` 的 URL 寫入 `spec.metadata["changelog_uri"]`

至少需要設定上述內容。

## 推送到 GitHub 並安裝
```sh
git init
git add .
git commit -m First Commit
git remote add origin git@github.com:<username>/<GEM Name>.git
git push -u origin master
```

### 安裝
```sh
gem install specific_instal
gem specific_install -l "git://github.com/<username>/<GEM Name>.git"
```

#### Gemfile
```rb
gem "<GEM Name>", github: "<username>/<GEM Name>.git", branch: :main
```
