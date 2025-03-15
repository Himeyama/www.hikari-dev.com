---
layout: post
title: Matplotlib (Pyplot) でよく使うコードの例
tags: [Matplotlib, pyplot]
---

よく使うものを例としてコードとグラフを紹介します。

## 目次

- [グラフを作成](#グラフを作成)
    - [1つのグラフ](#1-つのグラフ)
    - [2 x 3 のグラフ](#2-x-3-のグラフ)
- [グラフをプロット](#グラフをプロット)
- [タイトルの設定](#タイトルの設定)
- [軸ラベルの設定](#軸ラベルの設定)
    - [x 軸ラベルの設定](#x-軸ラベルの設定)
    - [y 軸ラベルの設定](#y-軸ラベルの設定)
- [グラフの上端・下端を設定](#グラフの上端・下端を設定)
- [グラフの左端・右端を設定](#グラフの左端・右端を設定)
- [グリッドの表示](#グリッドの表示)
- [目盛りの設定](#目盛りの設定)
- [目盛りの削除](#目盛りの削除)
- [目盛りの色の設定](#目盛りの色の設定)
- [グラフの間隔を調整](#グラフの間隔を調整)
- [画像を保存](#画像を保存)

## グラフを作成

まず使用するライブラリを読み込んでおきます。

```py
import matplotlib.pyplot as plt
import numpy as np
```

### 1 つのグラフ

```py
fig, ax = plt.subplots()
```

![](001.png)

### 2 x 3 のグラフ

```py
fig, axs = plt.subplots(2, 3)
```

![](002.png)

## グラフをプロット

**放物線のプロット**

```py
x = np.linspace(-1, 1, 201)
y = x ** 2

fig, ax = plt.subplots()
ax.plot(x, y)
```

![](003.png)

**点で放物線をプロット**

```py
fig, ax = plt.subplots()

x = np.linspace(-1, 1, 21)
y = x ** 2

ax.plot(x, y, 'o')
```

![](016.png)

**色をオレンジに**

```py
fig, ax = plt.subplots()

x = np.linspace(-1, 1, 21)
y = x ** 2

ax.plot(x, y, color="tab:orange")
```

![](017.png)

標準の色は以下の通り

|色|文字列|
|--|--|
|青|tab:blue|
|オレンジ|tab:orange|
|緑|tab:green|
|赤|tab:red|
|紫|tab:purple|
|茶|tab:brown|
|ピンク|tab:pink|
|グレー|tab:gray|
|オリーブ|tab:olive|
|シアン|tab:cyan|


**線の太さを 4 に設定**

```py
fig, ax = plt.subplots()

x = np.linspace(-1, 1, 21)
y = x ** 2

ax.plot(x, y, lw=4)
```

![](018.png)

## タイトルの設定

**タイトルを Title に設定**

```py
fig, ax = plt.subplots()
ax.set_title("Title")
```

![](010.png)

## 軸ラベルの設定
### x 軸ラベルの設定

**x 軸ラベルを Time (s) に設定**

```py
fig, ax = plt.subplots()
ax.set_xlabel("Time (s)")
```

![](011.png)

### y 軸ラベルの設定

**y 軸ラベルを Distance (m) に設定**

```py
fig, ax = plt.subplots()
ax.set_ylabel("Distance (m)")
```

![](012.png)

## グラフの上端・下端を設定

**上端を 100 に設定**

```py
fig, ax = plt.subplots()
ax.set_ylim(top=100)
```

![](004.png)

**下端を -100 に設定**

```py
fig, ax = plt.subplots()
ax.set_ylim(bottom=-100)
```

![](005.png)

**上端を 100、下端を -100 に設定**

```py
fig, ax = plt.subplots()
ax.set_ylim([-100, 100])
```

![](006.png)

## グラフの左端・右端を設定

**左端を -100 に設定**

```py
fig, ax = plt.subplots()
ax.set_xlim(left=-100)
```
![](007.png)

**右端を 100 に設定**

```py
fig, ax = plt.subplots()
ax.set_xlim(right=100)
```

![](008.png)

**左端を -100、右端を 100 に設定**

```py
fig, ax = plt.subplots()
ax.set_xlim([-100, 100])
```

![](009.png)

## グリッドの表示

```py
fig, ax = plt.subplots()
ax.grid()
```

![](013.png)

**縦のみグリッドを表示**

```py
fig, ax = plt.subplots()
ax.grid(axis="x")
```

![](014.png)

**横のみグリッドを表示**

```py
fig, ax = plt.subplots()
ax.grid(axis="y")
```

![](015.png)

## 目盛りの設定

**x 軸目盛りの設定**

```py
fig, ax = plt.subplots()
xticks = range(6)
ax.set_xticks(xticks)
```

![](019.png)

**x 軸目盛と目盛りラベルの設定**

```py
fig, ax = plt.subplots()
xticks = range(6)
ax.set_xticks(xticks, [f"{xtick}m" for xtick in xticks])
```

![](020.png)

**y 軸目盛りの設定**

```py
fig, ax = plt.subplots()
yticks = [i * 20 for i in range(6)]
ax.set_yticks(yticks)
```

![](021.png)


**y 軸目盛りと目盛りラベルの設定**

```py
fig, ax = plt.subplots()
yticks = [i * 20 for i in range(6)]
ax.set_yticks(yticks, [f"{ytick}%" for ytick in yticks])
```

![](022.png)

### 目盛りの削除

**x 軸目盛りの削除**

```py
fig, ax = plt.subplots()
ax.tick_params(bottom=False)
```

![](023.png)

**x 軸目盛りラベルの削除**

```py
fig, ax = plt.subplots()
ax.tick_params(labelbottom=False)
```

![](024.png)

**y 軸目盛の削除**

```py
fig, ax = plt.subplots()
ax.tick_params(left=False)
```

![](025.png)

**y 軸目盛りラベルの削除**

```py
fig, ax = plt.subplots()
ax.tick_params(labelleft=False)
```

![](026.png)

### 目盛りの色の設定

**x 軸目盛りの色を赤に設定**

```py
fig, ax = plt.subplots()
ax.tick_params(axis="x", color="tab:red")
```

![](027.png)

**x 軸目盛りラベルの色を赤に設定**

```py
fig, ax = plt.subplots()
ax.tick_params(axis="x", labelcolor="tab:red")
```

![](028.png)

**y 軸目盛りの色を赤に設定**

```py
fig, ax = plt.subplots()
ax.tick_params(axis="y", color="tab:red")
```

![](029.png)

**y 軸目盛りラベルの色を赤に設定**

```py
fig, ax = plt.subplots()
ax.tick_params(axis="y", labelcolor="tab:red")
```

![](030.png)

## グラフの間隔を調整

**縦の感覚を 0.2、横の間隔を 0.3 に設定**

```py
fig, ax = plt.subplots(3, 3)
fig.subplots_adjust(hspace=0.2, wspace=0.3)
```
%Cpu22 :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
![](031.png)

**間隔を自動に設定**

```py
fig, ax = plt.subplots(3, 3)
fig.tight_layout()
```

![](032.png)

## 画像を保存

**PNG 形式で保存**

```py
fig, ax = plt.subplots()
plt.savefig("graph.png")
```

![](graph.png)

**SVG 形式で保存**

```py
fig, ax = plt.subplots()
plt.savefig("svg.png")
```

![](graph.svg)

**PDF 形式で保存**

```py
fig, ax = plt.subplots()
plt.savefig("svg.pdf")
```

[graph.pdf](graph.pdf)

**300 dpi で保存**

```py
fig, ax = plt.subplots()
plt.savefig("graph300.png", dpi=300)
```

![](graph300.png)
