---
title: Avoid using delay() in Arduino
tags: [Arduino]
image: /img/ogp/2021-08-16-arduino-no-dalay.png
---

Using `delay()` in Arduino prevents any other actions from being performed during the waiting time.
I created a program that blinks an LED with a 1-second cycle using `millis()`.

# Algorithm
1. Get the time using `millis()` and divide it by the interval, assigning the result to `t`.
2. Compare the previous `t` and the new `t` and execute a function if they are different.

> Example

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