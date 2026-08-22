---
title: Fedora で llama.cpp を CUDA ビルドする
authors: hikari
tags: [LLM, llama.cpp, Fedora, CUDA, GPU]
image: /img/ogp/2026-08-22-fedora-llama-cpp-cuda-build.webp
---

{/* truncate */}

## 環境

- OS: Fedora Linux 43
- GPU: NVIDIA GeForce RTX 3080 (Ampere, compute capability 8.6)
- GPU ドライバ: Windows 側からパススルー (`/usr/lib/wsl/drivers`, `/usr/lib/wsl/lib` で確認)
- コンパイラ: GCC 15.3.1

`nvidia-smi` が実行可能な状態で、CUDA Toolkit (`nvcc` やライブラリ) は別途インストールした。

## CUDA Toolkit とビルドツールの導入

必要なパッケージのインストールは NVIDIA 公式の dnf リポジトリと `dnf` で完結する。

```bash
# NVIDIA 公式 CUDA リポジトリを追加 (Fedora バージョンに合わせる)
sudo dnf config-manager addrepo \
  --from-repofile=https://developer.download.nvidia.com/compute/cuda/repos/fedora43/x86_64/cuda-fedora43.repo

# CUDA Toolkit とビルドツールを導入
sudo dnf install -y cuda-toolkit cmake ninja-build
```

`nvcc` は `/usr/local/cuda/bin` に入るので PATH を通しておく。

```bash
export PATH=/usr/local/cuda/bin:$PATH
nvcc --version   # release 13.2 が入った
```

## ソース取得とビルド

```bash
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
cd llama.cpp

cmake -B build -G Ninja \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=86 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build build --config Release -j
```

`CMAKE_CUDA_ARCHITECTURES` は GPU 世代依存で、Ampere (RTX 30xx) は `86`、Ada (RTX 40xx) なら `89` を指定する。ここは OS に関係なく共通である。

`cmake` の configure ログで CUDA がちゃんと拾われているか確認できる。

```
-- Found CUDAToolkit: ... (found version "13.2.86")
-- CUDA Toolkit found
-- Including CUDA backend
```

## 動作確認

```bash
./build/bin/llama-cli --list-devices
```

```
Available devices:
  CUDA0: NVIDIA GeForce RTX 3080 (10239 MiB, 9069 MiB free)
```

GPU が正しく認識されている。テスト用に小さいモデル (Qwen2.5-0.5B-Instruct, Q4_K_M, 約 470 MB) を落として推論を試す。

```bash
./build/bin/llama-cli -m qwen2.5-0.5b-instruct-q4_k_m.gguf -p "こんにちは" -n 32 -ngl 99 -st
```

```
> こんにちは
こんにちは！どういたしまして。何か他に質問があればお気軽にお答えいたします。

[ Prompt: 863.5 t/s | Generation: 308.4 t/s ]
```

Windows の実測値 (Prompt: 890.0 t/s / Generation: 311.6 t/s) とほぼ同等の性能が出た。同じ RTX 3080 世代アーキテクチャなら OS が変わっても数値はそう変わらないらしい。

## ハマったポイント

最新の `llama-cli` は内部で HTTP サーバーを起動する構成に変わっていて (`llama-server` と共通化されている模様)、Windows 記事にある `-no-cnv` を付けても対話モード (プロンプト待ちの `>`) に入ってしまい、コマンドが返ってこなかった。

単発生成で終わらせたい場合は `-no-cnv` ではなく **`-st` (`--single-turn`)** を使う必要がある。

```bash
# ハングする
llama-cli -m model.gguf -p "hi" -n 8 -ngl 99 -no-cnv

# これで単発実行して終了する
llama-cli -m model.gguf -p "hi" -n 8 -ngl 99 -st
```

## Windows 版との違いまとめ

| 項目 | Windows | Fedora |
|---|---|---|
| ビルドツール導入 | winget | dnf |
| CUDA Toolkit 導入 | NVIDIA インストーラ (12.4) | NVIDIA dnf リポジトリ (13.2) |
| GPU ドライバ | Windows 側にネイティブインストール | Windows 側のドライバがパススルー、Linux 側には入れない |
| コンパイラ環境 | `vcvars64.bat` で MSVC を読み込む | 素の GCC、追加設定不要 |
| `CMAKE_CUDA_ARCHITECTURES` | GPU 世代依存 (共通) | GPU 世代依存 (共通) |
| 単発生成のフラグ | 記事執筆時点は `-no-cnv` で足りた | 最新版では `-st` が必要 |
| 実測パフォーマンス | 890.0 / 311.6 t/s | 863.5 / 308.4 t/s |

ビルド手順の骨格 (CMake オプション、アーキテクチャ指定) は OS を問わず共通で、差が出るのはパッケージ管理とドライバ周りだけだった。
