---
title: OpenLDAP の slappasswd で生成される SSHA とは
tags: [OpenLDAP, SHA]
layout: post
---

## slappasswd コマンドとは
slappasswd コマンドは OpenLDAP 用のパスワードを生成するコマンドで、
デフォルトでは SSHA を用いて、パスワードをハッシュ化する。

```mermaid
graph TD
    pass["Password: 'admin'"]
    ssha["{SSHA}23AUBfRZytVFNpe7onuFhyCSJOHRzCWh"]
    pass -- slappasswd --> ssha
```

## 認証の仕組み
SSHA では生成されたハッシュの末尾 4 バイトがソルトとなっており、
入力されたパスワードと保存されているソルトからハッシュを生成し、
保存されているハッシュと一致するかどうかで認証を行う。

```mermaid
graph TD
    pass["Password: 'admin' + Salt: D1 CC 25 A1"]
    pass -- SHA --> ssha["SSHA: DB 70 14 5 F4 59 CA D5 45 36 97 BB A2 7B 85 87 20 92 24 E1"]
    salt["Salt: D1 CC 25 A1"] -- "Base64 (encode)" --> sshabase64
    ssha -- "Base64 (encode)" --> sshabase64["23AUBfRZytVFNpe7onuFhyCSJOHRzCWh"]
```

以下のプログラムでは、
適切なパスワード (例: admin) を与えると、元のハッシュと生成されたハッシュが一致する。

```rb
require 'base64'
require 'digest'

pass = 'admin'
ssha = '{SSHA}23AUBfRZytVFNpe7onuFhyCSJOHRzCWh'
ssha =~ /{.+}(.+)/
salt256s = Base64.decode64(Regexp.last_match(1)).unpack('C*')[-4..-1]

salt = salt256s.pack('C*')
b_ssha = Digest::SHA1.digest(pass + salt)
Base64.strict_encode64(
  (b_ssha.unpack('C*') + salt256s).pack('C*')
)
```