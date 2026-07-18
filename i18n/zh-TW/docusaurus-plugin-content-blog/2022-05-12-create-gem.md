---
title: 建立 Ruby Gem
description: 關於如何建立 Ruby Gem 的備忘錄
authors: hikari
tags: [Ruby, Gem]
image: /img/ogp/2022-05-12-create-gem.webp
---

這篇備忘錄記錄了如何建立 Ruby Gem。

:::info
Ruby Gem 是一種打包和分發 Ruby 庫的標準方式。它包含了代碼、文檔、測試和元數據，使得 Ruby 程式碼的共享和重用變得非常容易。
:::

## 1. 使用 Bundler 建立 Gem 骨架

Bundler 提供了一個方便的命令來生成一個新的 Gem 的基本結構。

```bash
bundle gem my_gem_name
```

這會創建一個名為 `my_gem_name` 的目錄，其中包含 Gem 的基本文件，例如：
-   `my_gem_name.gemspec`：Gem 的元數據文件。
-   `lib/my_gem_name.rb`：Gem 的主文件。
-   `lib/my_gem_name/version.rb`：版本文件。
-   `Rakefile`：Rake 任務，用於測試、發布等。
-   `README.md`：說明文檔。
-   `LICENSE.txt`：許可證文件。

## 2. 理解 Gem 結構

### `my_gem_name.gemspec`

這是 Gem 的核心元數據文件。它包含了 Gem 的名稱、版本、描述、作者、依賴等信息。

```ruby
# my_gem_name.gemspec
require_relative "lib/my_gem_name/version"

Gem::Specification.new do |spec|
  spec.name          = "my_gem_name"
  spec.version       = MyGemName::VERSION
  spec.authors       = ["Your Name"]
  spec.email         = ["your_email@example.com"]

  spec.summary       = "A short summary of MyGemName."
  spec.description   = "A longer description of MyGemName."
  spec.homepage      = "https://github.com/yourusername/my_gem_name" # 你的 GitHub 倉庫或其他主頁
  spec.license       = "MIT"
  spec.required_ruby_version = Gem::Requirement.new(">= 2.3.0")

  # 指定哪些文件應該包含在 Gem 中
  spec.files         = Dir.chdir(File.expand_path(__dir__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  # 運行時依賴
  # spec.add_dependency "rack", "~> 2.0"

  # 開發時依賴 (測試、文檔生成等)
  spec.add_development_dependency "bundler", "~> 2.0"
  spec.add_development_dependency "rake", "~> 13.0"
  spec.add_development_dependency "minitest", "~> 5.0"
end
```

### `lib/my_gem_name.rb`

這是 Gem 的主入口文件，你可以在這裡定義你的模組和類。

```ruby
# lib/my_gem_name.rb
require_relative "my_gem_name/version"

module MyGemName
  class Error < StandardError; end
  # 在這裡定義你的 Gem 邏輯
  def self.greet(name)
    "Hello, #{name} from MyGemName!"
  end
end
```

### `lib/my_gem_name/version.rb`

這個文件用於定義 Gem 的版本號。

```ruby
# lib/my_gem_name/version.rb
module MyGemName
  VERSION = "0.1.0"
end
```

## 3. 開發你的 Gem

在 `lib/my_gem_name.rb` 或 `lib/my_gem_name/` 目錄下的其他文件中編寫你的 Ruby 程式碼。

範例：添加一個簡單的 `Calculator` 類。

```ruby
# lib/my_gem_name/calculator.rb
module MyGemName
  class Calculator
    def add(a, b)
      a + b
    end

    def subtract(a, b)
      a - b
    end
  end
end
```

然後在 `lib/my_gem_name.rb` 中引入它：

```ruby
# lib/my_gem_name.rb
require_relative "my_gem_name/version"
require_relative "my_gem_name/calculator" # 引入新的文件

module MyGemName
  class Error < StandardError; end
  def self.greet(name)
    "Hello, #{name} from MyGemName!"
  end
end
```

## 4. 測試你的 Gem

Bundler 生成的骨架通常會包含一個 `test/` 或 `spec/` 目錄。
你可以使用 MiniTest 或 RSpec 來編寫測試。

範例 (`test/my_gem_name_test.rb`):

```ruby
require "minitest/autorun"
require "my_gem_name"

class MyGemNameTest < Minitest::Test
  def test_that_it_has_a_version_number
    refute_nil ::MyGemName::VERSION
  end

  def test_it_greets_correctly
    assert_equal "Hello, World from MyGemName!", MyGemName.greet("World")
  end

  def test_calculator_add
    calculator = MyGemName::Calculator.new
    assert_equal 5, calculator.add(2, 3)
  end
end
```

運行測試：

```bash
bundle exec rake test
```

## 5. 建立和安裝你的 Gem

### 建立 Gem

```bash
bundle exec rake build
```

這會在 `pkg/` 目錄下生成一個 `.gem` 文件。

### 本地安裝 Gem

你可以將建立的 `.gem` 文件安裝到你的本地系統中，以便在其他項目中使用它：

```bash
gem install pkg/my_gem_name-0.1.0.gem
```

## 6. 發布你的 Gem (到 RubyGems.org)

1.  **創建 RubyGems.org 帳戶**：如果還沒有，在 [RubyGems.org](https://rubygems.org/) 上註冊一個帳戶。
2.  **登錄**：
    ```bash
    gem push --help # 查看幫助
    ```
    你需要配置你的 API 密鑰。
3.  **推送到 RubyGems.org**：
    ```bash
    bundle exec rake release
    ```
    或者直接使用 `gem push`：
    ```bash
    gem push pkg/my_gem_name-0.1.0.gem
    ```

確保你的 Gem 名稱在 RubyGems.org 上是唯一的。

## 總結

建立 Ruby Gem 是一個相對直接的過程，Bundler 提供了很好的起點。通過理解 `gemspec` 文件、組織你的程式碼、編寫測試以及正確發布，你可以輕鬆地與 Ruby 社區分享你的程式碼。
