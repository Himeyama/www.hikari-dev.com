---
title: Arduino で delay() を使わない
tags: [Arduino]
layout: default
---

Arduino で `delay()` を使うと、待機時間中に何もできない。
`millis()` を使用した 1 秒周期の LED 点滅するプログラムを作った。

# アルゴリズム
1. `millis()` で時間を取得し時間で割って、`t` に代入
1. 前回の t と新たな t を比較して異なる場合に関数を実行

> 例

```cpp
unsigned long t = 0, ot;

void setup(){
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  ot = t;
  t = millis() / 500;
  if(ot != t){
    if(t % 2){
      digitalWrite(LED_BUILTIN, LOW);
    }else{
      digitalWrite(LED_BUILTIN, HIGH);
    }
  }
}
```