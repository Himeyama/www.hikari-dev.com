---
title: Numo::NArray でドット積
layout: default
date: '2021-06-04 00:20'
---

```rb
require "numo/narray"
```

## 実数ベクトルのドット積
```rb
a = Numo::NArray[4, -1, 2]
b = [2, -2, -1]
c = a.dot b
```

```rb
8
```

## 複素数ベクトルのドット積
```rb
a = Numo::NArray[1+1i, 1-1i, -1+1i, -1-1i]
b = [3-4i, 6-2i, 1+2i, 4+3i]
c = a.conj.dot b
```

```rb
(1.0-5.0i)
```

### 複素数とそれ自身のドット積
```rb
d = a.conj.dot a
```

```rb
(8.0+0.0i)
```

## 行列のドット積
```rb
a = Numo::NArray[[1, 2, 3], [4, 5, 6], [7, 8, 9]]
b = [[9, 8, 7], [6, 5, 4], [3, 2, 1]]
c = (a * b).sum(0)
```

```rb
Numo::Int64#shape=[3]
[54, 57, 54]
```

### 行ベクトルとしてドット積を求める
```rb
c = Numo::NArray[(a * b).sum(1)].transpose
```

```rb
Numo::Int64(view)#shape=[3,1]
[[46], 
 [73], 
 [46]]
```