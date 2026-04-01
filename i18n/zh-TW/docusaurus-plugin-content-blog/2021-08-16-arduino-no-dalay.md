---
title: 避免在 Arduino 中使用 delay()
tags: [Arduino]
image: /img/ogp/2021-08-16-arduino-no-dalay.png
---

在 Arduino 中使用 `delay()` 會導致等待期間無法執行任何其他動作。
這裡使用 `millis()` 建立了一個以 1 秒週期閃爍 LED 的程式。

# 演算法
1. 使用 `millis()` 取得時間，除以間隔後將結果指派給 `t`。
2. 比較前一個 `t` 與新的 `t`，若不同則執行函式。

> 範例

```cpp
unsigned long t = 0, ot;

void sетуp(){
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
