---
title: ガウシアンフィルターでノイズ除去 (Python / Scipy)
description: scipy の gaussian_filter1d でノイズ除去
date: "2021-6-10"
layout: post
---

例として、1[Hz] の sin 波を信号とする。
平均 0、標準偏差 0.5 の正規分布から乱数を作成したノイズを信号に加える。

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

![pyplot](/assets/img/gaussianfilter/1.svg)

標準偏差 5 のガウシアンフィルターをかける。
標準偏差が大きいほど、滑らかになるが元の信号と外れる。

```python
y = gaussian_filter1d(x, 5)
plt.plot(t, y, label="filtered")
plt.plot(t, s, label="signal")
plt.legend(loc=1)
plt.show()
```

![pyplot](/assets/img/gaussianfilter/2.svg)
