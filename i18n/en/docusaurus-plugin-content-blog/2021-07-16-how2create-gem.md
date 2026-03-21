---
title: How to create a gem
tags: [Ruby]
date: '2021-07-16 01:54'
---

## Creating a Template
```sh
bundle gem <GEM Name> -t
cd <GEM Name>
```

## Editing the Gemspec
0. Open `<GEM Name>.gemspec`.
0. Edit `spec.summary`, `spec.description`, `spec.homepage`,
0. Write the homepage URL to `spec.metadata["allowed_push_host"]`
0. Write the Gem's page to `spec.homepage`
0. Write the repository URL to `spec.metadata["source_code_uri"]`
0. Write the URL of `changelog.md` to `spec.metadata["changelog_uri"]`

Set at least this much.

## Push to GitHub and Install
```sh
git init
git add .
git commit -m First Commit
git remote add origin git@github.com:<username>/<GEM Name>.git
git push -u origin master
```

### Install
```sh
gem install specific_instal
gem specific_install -l "git://github.com/<username>/<GEM Name>.git"
```

#### Gemfile
```rb
gem "<GEM Name>", github: "<username>/<GEM Name>.git", branch: :main
```
