---
title: 自作 gem の作り方
tag: [Ruby, gem]
layout: post
---

## gem を作成 (`bundle gem`)
`gem_name` という gem のテンプレートを作成する場合は以下を実行します。

```bash
bundle gem gem_name
```

## `bundle gem` のオプション
`bundle gem` にはオプションが存在します。

詳細またはその他のオプションを知りたい場合は [Bundler: bundle gem](https://bundler.io/v2.3/man/bundle-gem.1.html) を参照してください。

|オプション|説明|
|:--|:--|
|`--exe`, `-b`, `--bin`|gem にバイナリ実行ファイルを含めます。|
|`--ext`|gem に C 拡張を含めます。|
|`--mit`|プロジェクトを MIT ライセンスにします。|
|`--ci`|ci サービスを設定します。|
|`--linter`|リンターとフォーマッターを指定します。|

> 例: リンターに `rubocop` を使用し、MIT ライセンスでコマンドを含み、C 言語拡張を含む `myapp` という gem を作成する場合
```bash
bundle gem myapp --exe --ext --mit --ci=github --linter=rubocop
```

## プロジェクトの構造
上記コマンドで生成したプロジェクトの構造は以下のようになっています。

```bash
myapp
├── Gemfile
├── LICENSE.txt
├── README.md
├── Rakefile
├── bin
│   ├── console
│   └── setup
├── exe
│   └── myapp
├── ext
│   └── myapp
│       ├── extconf.rb
│       ├── myapp.c
│       └── myapp.h
├── lib
│   ├── myapp
│   │   └── version.rb
│   └── myapp.rb
├── myapp.gemspec
└── sig
    └── myapp.rbs
```

各ディレクトリーは以下のようになっています。

- lib/: ライブラリーのコード (`require` で呼び出される)
- ext/: C 言語のソースコード (インストール時にコンパイルされ、`require` で呼び出される)
- exe/: コマンドがある

`myapp.gemspec` がもっとも重要なファイルで、gem の構成が定義されています。
基本的に上記 3 つのディレクトリー (C 言語を使用しない場合は、2 つのディレクトリー) の中にあるファイルと gemspec ファイルを編集します。(必要に応じて Rakefile や README.md も編集します。)

**Gemfile は編集しないでください。**

## `gemspec` の編集
gem を作るために `myapp.gemspec` を編集する必要があります。

TODO のある行やホームページの行をコメントアウトし、`spec.summary` の設定を行えば最低限動作します。

必須である項目を以下に示します。
- spec.name
- spec.version
- spec.authors
- spec.summary

`bundle install` コマンドを実行し、エラーがなければ問題ありません。

### 依存パッケージの追加
gemspec に以下のように追記して依存している gem を追加できます。

```rb
  spec.add_dependency "example-gem", "~> 1.0"
```

gemspec に以下のように追記し開発時に必要な gem を追加できます。

```rb
  spec.add_development_dependency "example-gem", "~> 1.0"
```

詳しくは、[class Gem::Specification (Ruby 3.1) リファレンスマニュアル](https://docs.ruby-lang.org/ja/latest/class/Gem=3a=3aSpecification.html) や [library rubygems (Ruby 3.1 リファレンスマニュアル)](https://docs.ruby-lang.org/ja/latest/library/rubygems.html) を参照してください。

## `bundle install`
`bundle install` を実行することで、Gemfile および gemspec に記述されている gem がインストールされます。

## バージョンの変更
バージョンは、`lib/myapp/version.rb` に定義されています。

## コンパイル
以下のコマンドを実行し、C 拡張をコンパイルします。
このコマンドの実行により、共有ライブラリー `lib/myapp/myapp.so` が生成されます。

```rb
rake compile
```

コンパイル後、gem に含まれるコマンド実行すると、
エラーなく実行されます。

```rb
bundle exec myapp
```

## C 拡張
C 言語で Ruby を拡張することができます。

たとえば、`/etc/myapp/myapp.c` を以下のように変更します。

```diff
void
Init_myapp(void)
{
  rb_mMyapp = rb_define_module("Myapp");
+ rb_p(rb_str_new2("Hello, world!"));
}
```

`rake compile` でコンパイルを行い、`bundle exec myapp` を実行すると、`"Hello, world!"` と表示されます。

この例は、C 言語から Ruby の C API を呼び出し表示するプログラムで、

```rb
p "Hello, world!"
```

と同等です。

Ruby の C API だけではなく、コンピューターにインストールされている共有ライブラリーを扱うことができるため、ラッパーを作成することが可能です。

また、C 拡張により計算が必要な場合に高速化することができます。

## ライブラリーの作成
`lib/myapp.rb` あたりを編集。

新しいファイルを作成した場合は、`git add` する必要があります。

## gem をインストール (`rake install`)
プロジェクト内の gem がインストールされます。

```bash
rake install
```

## gem を公開 (`rake release`)
gem を公開するには、rubygems のアカウントを作成する必要があります。
リリースするたびに、バージョンを変更する必要があります。

```bash
rake release
```

## gem パッケージを生成 (`rake build`)
プロジェクトから `pkg/myapp-x.x.x.gem` が作成されます。

```bash
rake build
```
