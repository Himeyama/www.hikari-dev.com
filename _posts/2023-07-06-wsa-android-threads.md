---
layout: default
title: threads を Windows 11 で利用する方法
tag: [android, apk, threads]
---

## apk の抽出
threads がインストールされている Android 端末を Windows PC に接続し、
adb コマンドを実行して apk を抽出します。

まずは、パッケージの場所を調べるために検索を行います。

```sh
adb shell pm list packages -f | Select-String instagram.barcelona
```

次に、抽出します。apk は PC に保存されます。

```sh
adb pull /data/app/.../base.apk
```

次に、WSA に接続します。
WSA 側で開発者モード及び USB デバッグを有効にします。

```sh
adb connect 127.0.0.1:58526
```

![Threads apk WSA](</assets/img/wsa-android-threads/スクリーンショット 2023-07-06 235222.png>)

最後に、抽出した apk を WSA にインストールします。

```sh
adb install base.apk
```

できました。

![Threads Android](</assets/img/wsa-android-threads/スクリーンショット 2023-07-07 001525.png>)
