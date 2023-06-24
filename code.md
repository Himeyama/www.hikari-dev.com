---
layout: default
title: タイトル
---

## 般若心経
摩訶般若波羅密多心経
観自在菩薩行深般若波羅密多時照見五
蘊皆空度一切苦厄舎利子色不異空空不
異色色即是空空即是色受想行識亦復如
是舎利子是諸法空相不生不滅不垢不浄
不増不減是故空中無色無受想行識無眼
耳鼻舌身意無色声香味触法無眼界乃至
無意識界無無明亦無無明尽乃至無老死
亦無老死尽無苦集滅道無智亦無得以無
所得故菩提薩垂依般若波羅蜜多故心無
圭礙無圭礙故無有恐怖遠離一切顛倒夢
想究竟涅槃三世諸仏依般若波羅蜜多故
得阿耨多羅三藐三菩提故知般若波羅蜜
多是大神呪是大明呪是無上呪是無等等
呪能除一切苦真実不虚故説般若波羅蜜
多呪即説呪曰
羯諦羯諦波羅羯諦波羅僧羯諦菩提薩婆訶
般若心経

## 阿弥陀経
如是我聞一時佛在舍衛國祇樹給孤獨園與大比丘衆千二百五十人倶皆是大阿羅漢衆所知識長老舍利弗摩訶目犍連摩訶迦葉摩訶迦旃延摩訶倶絺羅離婆多周利槃陀伽難陀阿難陀羅睺羅憍梵波提賓頭盧頗羅墮迦留陀夷摩訶劫賓那薄拘羅阿㝹樓駄如是等諸大弟子并諸菩薩摩訶薩文殊師利法王子阿逸多菩薩乾陀訶提菩薩常精進菩薩與如是等諸大菩薩及釋提桓因等無量諸天大衆倶

```c
#include <stdio.h>

int main(void){
    /* 出力 */
    puts("こんにちは");
    return 0;
}
```

```python
# フィボナッチ数列
def fib(n):
    a, b = 0, 1
    while a < n:
        print(a, end=' ')
        a, b = b, a+b
    print()

fib(1000)
```

```ruby
# The Greeter class
class Greeter
  def initialize(name)
    @name = name.capitalize
  end

  def salute
    puts "Hello #{@name}!"
  end
end

# Create a new object
g = Greeter.new("world")

# Output "Hello World!"
g.salute
```

```javascript
const http = require('node:http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
}); 
```


```csharp
using System;

namespace HelloWorld
{
  class Program
  {
    static void Main(string[] args)
    {
      Console.WriteLine("Hello World!");    
    }
  }
}
```

```java
public class Main {
  public static void main(String[] args) {
    System.out.println("Hello World");
  }
}
```

```rust
pub fn try_div(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err(String::from("Divide-by-zero"))
    } else {
        Ok(a / b)
    }
}
```