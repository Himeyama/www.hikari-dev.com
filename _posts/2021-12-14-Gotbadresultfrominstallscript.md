---
title: Visual Studio Code で Got bad result from install script. のエラーの対処
layout: default
date: '2021-12-14 04:08'
---

# 概要
vscode で ssh をしようとしたが、`Got bad result from install script.` というエラーが起き、接続できない。

何故かコマンドプロンプトも起動しない。

# 解決法
レジストリ エディターを開き、`HKEY_CURRENT_USER\Software\Microsoft\Command Processor` にある `AutoRun` の値を空にした。


