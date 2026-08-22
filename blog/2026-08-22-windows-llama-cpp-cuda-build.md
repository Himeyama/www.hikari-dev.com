---
title: Windows 11 で llama.cpp をビルドして動かすまで
authors: hikari
tags: [LLM, llama.cpp, Windows, CUDA, GPU]
image: /img/ogp/2026-08-22-windows-llama-cpp-cuda-build.webp
---

ローカル LLM 推論エンジンの定番である [llama.cpp](https://github.com/ggml-org/llama.cpp) を、Windows 11 環境で NVIDIA GPU の CUDA バックエンドを有効にしてソースからビルドし、実際にモデルを動かすところまでの記録。

{/* truncate */}

## 環境

- OS: Windows 11 Pro
- GPU: NVIDIA GeForce RTX (VRAM 8 GB 以上)
- CUDA Toolkit: 12.4 (インストール済み)
- シェル: PowerShell

## 必要なツールの確認とインストール

llama.cpp のビルドには以下が必要である。

- Git
- CMake
- Ninja (ビルドシステム)
- MSVC (Visual Studio Build Tools の C++ ビルドツール)
- CUDA Toolkit (GPU オフロードを使う場合)

今回の環境では Git・CUDA Toolkit・Visual Studio Build Tools はインストール済みだったが、CMake と Ninja が入っていなかったため winget で導入した。

```powershell
winget install --id Kitware.CMake -e
winget install --id Ninja-build.Ninja -e
```

MSVC コンパイラ (`cl.exe`) は Visual Studio Build Tools に含まれているが、通常の PowerShell セッションには PATH が通っていない。ビルド時は `vcvars64.bat` を経由して環境変数を読み込む必要がある。

```powershell
cmd /c '"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && <続けてビルドコマンド>'
```

## ソースの取得

```powershell
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git C:\path\to\llama.cpp
```

フル履歴は不要なので `--depth 1` の shallow clone で十分である。リポジトリはファイル数が多く、フルクローンだと想像以上に時間がかかることがあるので注意する。

## CMake でビルド設定

CUDA バックエンドを有効にし、GPU のアーキテクチャ (Compute Capability) を指定して構成する。Ampere 世代 (RTX 30xx) であれば `86`、Ada Lovelace 世代 (RTX 40xx) であれば `89` のように、GPU に応じて値を変える。

```powershell
cmake -B build -G Ninja `
  -DGGML_CUDA=ON `
  -DCMAKE_CUDA_ARCHITECTURES=86 `
  -DCMAKE_BUILD_TYPE=Release
```

構成ログで以下が確認できれば CUDA バックエンドが正しく認識されている。

```
-- Found CUDAToolkit: ... (found version "12.4.131")
-- CUDA Toolkit found
-- Including CUDA backend
```

なお `OpenSSL not found` の警告が出ることがあるが、これは server の HTTPS 対応が無効になるだけで、通常のローカル利用には影響しない。

## ビルド実行

```powershell
cmake --build build --config Release -j
```

CPU 用のコード生成に加えて CUDA カーネルのコンパイルも走るため、数分から十数分程度かかる。完了すると `build\bin\` 以下に各種実行ファイルが生成される。主なものは以下の通り。

- `llama-cli.exe` — 対話型 CLI
- `llama-server.exe` — OpenAI 互換 API サーバー + WebUI
- `llama-quantize.exe` — モデルの量子化ツール
- `llama-bench.exe` — ベンチマークツール

ビルド中、WebUI 用アセットの `npm ci` が Node.js のバージョン不一致で失敗するケースがあったが、これは失敗してもビルド自体は止まらず、Hugging Face 上にホストされているビルド済み UI アセットのダウンロードにフォールバックしてくれるため、Node.js のバージョンを気にする必要はなかった。

## 動作確認

ビルドが通ったら、軽量な GGUF モデルで動作確認する。今回は Hugging Face 上の小型モデル (0.5B、Q4_K_M 量子化、500 MB 弱) を使った。

```powershell
.\build\bin\llama-cli.exe -m .\models\test-model-q4_k_m.gguf -p "こんにちは" -n 32 -ngl 99
```

`-ngl 99` は全レイヤーを GPU にオフロードする指定である。実行すると日本語で自然な応答が返り、ログには以下のような速度が表示された。

```
[ Prompt: 890.0 t/s | Generation: 311.6 t/s ]
```

CPU のみの推論と比べて桁違いに速く、CUDA オフロードが正しく機能していることが確認できた。

## サーバーモードでのテスト

`llama-server.exe` を起動すると OpenAI 互換の REST API と WebUI が立ち上がる。

```powershell
.\build\bin\llama-server.exe -m .\models\test-model-q4_k_m.gguf -ngl 99
```

起動後、ヘルスチェックと Chat Completions API を PowerShell から叩いて動作確認した。

```powershell
# ヘルスチェック
Invoke-WebRequest -Uri "http://127.0.0.1:8080/health" -UseBasicParsing

# Chat Completions (OpenAI互換)
$body = @{
  messages = @(@{role="user"; content="こんにちは、あなたは誰ですか？簡潔に答えてください。"})
  max_tokens = 64
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
```

`/health` は `200 OK`、Chat Completions も自然な応答を返し、`usage` にトークン数の内訳が含まれるなど、OpenAI API とほぼ同じ感覚で使えることが確認できた。ブラウザで `http://127.0.0.1:8080/` にアクセスすれば同梱の WebUI も利用できる。

## まとめ

Windows 11 上でも、以下の流れで llama.cpp の CUDA ビルド環境を構築できた。

1. winget で CMake / Ninja を導入
2. `vcvars64.bat` で MSVC 環境をロードしつつ CMake 構成・ビルド
3. `CMAKE_CUDA_ARCHITECTURES` を GPU に合わせて指定
4. 小型モデルで CLI・サーバーの両方の動作確認

一度環境を作ってしまえば、あとはモデルを差し替えるだけでローカル LLM 推論を手軽に試せる。VRAM 容量に応じて量子化レベルやオフロードするレイヤー数 (`-ngl`) を調整するのがポイントである。
