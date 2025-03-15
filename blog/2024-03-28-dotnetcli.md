---
layout: post
title: よく使う dotnet コマンドまとめ
tags: [dotnet]
---

|コマンド|機能|
|:--:|:--:|
|`dotnet new`|新しいプロジェクトを作成|
|`dotnet add`|パッケージを追加|
|`dotnet remove`|パッケージを削除|
|`dotnet publish`|ディレクトリにアプリを発行|
|`dotnet run`|プロジェクトを実行|
|`dotnet sln`|ソリューションファイルを扱う|

## dotnet new

### 例
```ps1
dotnet new wpf
```

## dotnet add
### 例
```ps1
dotnet add package Microsoft.Web.WebView2
```

## dotnet remove
### 例
```ps1
dotnet remove package Microsoft.Web.WebView2
```