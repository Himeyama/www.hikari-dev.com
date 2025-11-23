---
title: Denoising with a Gaussian Filter (Python / Scipy)
authors: hikari
description: Denoise with scipy's gaussian_filter1d
date: "2021-6-10"
---

As an example, let's use a 1[Hz] sine wave as the signal.
Add noise generated from random numbers following a normal distribution with a mean of 0 and a standard deviation of 0.5 to the signal.

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

Apply a Gaussian filter with a standard deviation of 5.
The larger the standard deviation, the smoother the result, but the more it deviates from the original signal.

```python
y = gaussian_filter1d(x, 5)
plt.plot(t, y, label="filtered")
plt.plot(t, s, label="signal")
plt.legend(loc=1)
plt.show()
```

![pyplot](/img/blog/2021-06-10-gaussianfilter/2.svg)

