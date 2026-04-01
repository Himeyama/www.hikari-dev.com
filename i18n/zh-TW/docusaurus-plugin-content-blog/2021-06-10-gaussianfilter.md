---
title: 使用高斯濾波器進行降噪（Python / Scipy）
tags: [Image Processing]
description: Denoise with scipy's gaussian_filter1d
date: "2021-6-10"
image: /img/blog/2021-06-10-gaussianfilter/1.svg
---

以 1[Hz] 的正弦波作為訊號範例。
在訊號上疊加由均值為 0、標準差為 0.5 的常態分布隨機數所產生的雜訊。

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import gaussian_filter1d

t = np.arange(1000) / 100
s = np.sin(2*np.pi*t)
noise = np.random.normal(0, 0.5, size=len(t))
x = s + noise

plt.plot(t, x, label="+noise")
plt.plot(t, s, label="signal")
plt.legend(loc=1)
plt.show()
```

![pyplot](/img/blog/2021-06-10-gaussianfilter/1.svg)

套用標準差為 5 的高斯濾波器。
標準差越大，結果越平滑，但與原始訊號的偏差也越大。

```python
y = gaussian_filter1d(x, 5)
plt.plot(t, y, label="filtered")
plt.plot(t, s, label="signal")
plt.legend(loc=1)
plt.show()
```

![pyplot](/img/blog/2021-06-10-gaussianfilter/2.svg)

