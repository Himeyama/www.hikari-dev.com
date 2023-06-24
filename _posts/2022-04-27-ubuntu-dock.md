---
title: Ubuntu で gsettings を使用し Dock の設定を行う
tags: [Ubuntu, Ubuntu 22.04, GNOME]
---

スクリプトで Dock の設定したいときや、SSH で設定したいときに使う。

## Dock を自動的に隠す

|設定する値|説明|
|:--:|:--:|
|true|自動的に隠さない|
|false|自動的に隠す|

> 例: Dock を自動的に隠す

```bash
# 現在の設定
$ gsettings get org.gnome.shell.extensions.dash-to-dock dock-fixed
true

$ gsettings set org.gnome.shell.extensions.dash-to-dock dock-fixed false
```

## パネルモード
Dock を画面の端まで引き伸ばして表示。

|設定する値|説明|
|:--:|:--:|
|true|引き延ばさない|
|false|引き延ばす|

> 例: パネルを引き延ばさない

```bash
# 現在の設定
$ gsettings get org.gnome.shell.extensions.dash-to-dock extend-height
true

$ gsettings set org.gnome.shell.extensions.dash-to-dock extend-height false
```

## アイコンサイズの変更

|設定する値|説明|
|:--:|:--:|
|数値|アイコンサイズ|

> 例: アイコンサイズを 30 に変更

```bash
# 現在の設定
$ gsettings get org.gnome.shell.extensions.dash-to-dock dash-max-icon-size
48

$ gsettings set org.gnome.shell.extensions.dash-to-dock dash-max-icon-size 30
```


## Dock の表示位置を変更

「設定」では設定ができない `'TOP'` が設定可能。上に微妙な隙間ができる。

|設定する値|説明|
|:--:|:--:|
|LEFT|左|
|BOTTOM|下|
|RIGHT|右|
|TOP|上|

> 例: Dock の表示位置を下に設定

```bash
# 現在の設定
$ gsettings get org.gnome.shell.extensions.dash-to-dock dock-position
'LEFT'

$ gsettings set org.gnome.shell.extensions.dash-to-dock dock-position 'BOTTOM'
```

## ゴミ箱の表示

|設定する値|説明|
|:--:|:--:|
|true|表示|
|false|非表示|

> 例: ゴミ箱を非表示に設定

```bash
# 現在の設定
$ gsettings get org.gnome.shell.extensions.dash-to-dock show-trash
true

$ gsettings set org.gnome.shell.extensions.dash-to-dock show-trash false
```
