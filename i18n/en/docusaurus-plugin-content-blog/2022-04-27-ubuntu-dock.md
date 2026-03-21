---
title: Configure the Dock using gsettings on Ubuntu
tags: [Linux]
---

This is useful when you want to configure the Dock with a script or when configuring via SSH.

## Automatically hide the Dock
|Setting Value|Description|
|:-:|:-:|
|true|Do not automatically hide|
|false|Automatically hide|

> Example: Automatically hide the Dock
```bash
# Current setting
$ gssettings get org.gnome.shell.extensions.dash-to-dock dock-fixed
true

$ gssettings set org.gnome.shell.extensions.dash-to-dock dock-fixed false
```

## Panel Mode
Stretches the Dock to the edge of the screen.

|Setting Value|Description|
|:-:|:-:|
|true|Do not stretch|
|false|Stretch|

> Example: Do not stretch the Dock
```bash
# Current setting
$ gssettings get org.gnome.shell.extensions.dash-to-dock extend-height
true

$ gssettings set org.gnome.shell.extensions.dash-to-dock extend-height false
```

## Change Icon Size
|Setting Value|Description|
|:-:|:-:|
|Number|Icon size|

> Example: Change icon size to 30
```bash
# Current setting
$ gssettings get org.gnome.shell.extensions.dash-to-dock dash-max-icon-size
48

$ gssettings set org.gnome.shell.extensions.dash-to-dock dash-max-icon-size 30
```

## Change Dock Position
Can set `'TOP'` which cannot be set in "Settings". Creates a slight gap at the top.

|Setting Value|Description|
|:-:|:-:|
|LEFT|Left|
|BOTTOM|Bottom|
|RIGHT|Right|
|TOP|Top|

> Example: Set the Dock position to bottom
```bash
# Current setting
$ gssettings get org.gnome.shell.extensions.dash-to-dock dock-position
'LEFT'

$ gssettings set org.gnome.shell.extensions.dash-to-dock dock-position 'BOTTOM'
```

## Show Trash
|Setting Value|Description|
|:-:|:-:|
|true|Show|
|false|Hide|

> Example: Hide the trash
```bash
# Current setting
$ gssettings get org.gnome.shell.extensions.dash-to-dock show-trash
true

$ gssettings set org.gnome.shell.extensions.dash-to-dock show-trash false
```