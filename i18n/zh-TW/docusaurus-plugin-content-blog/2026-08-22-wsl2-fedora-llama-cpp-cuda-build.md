---
title: 在 WSL2 (Fedora) 上以 CUDA 建置 llama.cpp
authors: hikari
tags: [LLM, llama.cpp, WSL2, Fedora, CUDA, GPU]
image: /img/ogp/2026-08-22-wsl2-fedora-llama-cpp-cuda-build.webp
---

參考先前寫的 [在 Windows 上以 CUDA 建置 llama.cpp 的文章](/blog/2026/08/22/windows-llama-cpp-cuda-build)，這次在 WSL2 上的 Fedora 43 環境嘗試相同的做法。只有工具鏈不同，流程幾乎一樣。

{/* truncate */}

## 環境

- OS: Fedora (於 Hyper-V 上)
- GPU: NVIDIA GeForce RTX 3080 (Ampere, compute capability 8.6)
- GPU 驅動程式: 由 Windows 端透通傳遞 (可透過 `/usr/lib/wsl/drivers`、`/usr/lib/wsl/lib` 確認)
- 編譯器: GCC 15.3.1

`nvidia-smi` 一開始就可以執行，CUDA Toolkit (`nvcc` 及相關函式庫) 則另外安裝。

## 安裝 CUDA Toolkit 與建置工具

只要透過 NVIDIA 官方的 dnf 儲存庫與 `dnf`，就能完成必要套件的安裝。

```bash
# 新增 NVIDIA 官方 CUDA 儲存庫 (依 Fedora 版本調整)
sudo dnf config-manager addrepo \
  --from-repofile=https://developer.download.nvidia.com/compute/cuda/repos/fedora43/x86_64/cuda-fedora43.repo

# 安裝 CUDA Toolkit 與建置工具
sudo dnf install -y cuda-toolkit cmake ninja-build
```

`nvcc` 會安裝到 `/usr/local/cuda/bin`，記得先加入 PATH。

```bash
export PATH=/usr/local/cuda/bin:$PATH
nvcc --version   # 安裝了 release 13.2
```

## 取得原始碼並建置

```bash
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
cd llama.cpp

cmake -B build -G Ninja \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=86 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build build --config Release -j
```

`CMAKE_CUDA_ARCHITECTURES` 依 GPU 世代而定，Ampere (RTX 30xx) 為 `86`，Ada (RTX 40xx) 則為 `89`。這部分與作業系統無關，通用。

從 `cmake` 的 configure 記錄可以確認 CUDA 是否被正確偵測到。

```
-- Found CUDAToolkit: ... (found version "13.2.86")
-- CUDA Toolkit found
-- Including CUDA backend
```

## 驗證運作

```bash
./build/bin/llama-cli --list-devices
```

```
Available devices:
  CUDA0: NVIDIA GeForce RTX 3080 (10239 MiB, 9069 MiB free)
```

GPU 已被正確辨識。接著下載一個小型模型 (Qwen2.5-0.5B-Instruct, Q4_K_M, 約 470 MB) 來測試推論。

```bash
./build/bin/llama-cli -m qwen2.5-0.5b-instruct-q4_k_m.gguf -p "こんにちは" -n 32 -ngl 99 -st
```

```
> こんにちは
こんにちは！どういたしまして。何か他に質問があればお気軽にお答えいたします。

[ Prompt: 863.5 t/s | Generation: 308.4 t/s ]
```

與 Windows 版的實測數值 (Prompt: 890.0 t/s / Generation: 311.6 t/s) 幾乎相同。看來只要是相同的 RTX 3080 世代架構，即使作業系統不同，數值也不會有太大差異。

## 遇到的坑

最新版的 `llama-cli` 內部改為啟動 HTTP 伺服器 (似乎與 `llama-server` 共用同一套邏輯)，就算加上 Windows 文章中提到的 `-no-cnv`，還是會進入互動模式 (等待輸入的 `>` 提示字元)，指令不會返回。

若想以單次生成方式結束，需要使用 **`-st` (`--single-turn`)**，而不是 `-no-cnv`。

```bash
# 會卡住
llama-cli -m model.gguf -p "hi" -n 8 -ngl 99 -no-cnv

# 這樣才能單次執行後結束
llama-cli -m model.gguf -p "hi" -n 8 -ngl 99 -st
```

## 與 Windows 版的差異整理

| 項目 | Windows | WSL2 (Fedora) |
|---|---|---|
| 安裝建置工具 | winget | dnf |
| 安裝 CUDA Toolkit | NVIDIA 安裝程式 (12.4) | NVIDIA dnf 儲存庫 (13.2) |
| GPU 驅動程式 | 在 Windows 端原生安裝 | 由 Windows 端透通傳遞，Linux 端不安裝 |
| 編譯器環境 | 透過 `vcvars64.bat` 載入 MSVC | 直接使用 GCC，不需額外設定 |
| `CMAKE_CUDA_ARCHITECTURES` | 依 GPU 世代而定 (通用) | 依 GPU 世代而定 (通用) |
| 單次生成用旗標 | 撰文當下 `-no-cnv` 就足夠 | 最新版需要 `-st` |
| 實測效能 | 890.0 / 311.6 t/s | 863.5 / 308.4 t/s |

建置流程的骨架 (CMake 選項、架構指定) 與作業系統無關、大致通用，差異只出現在套件管理與驅動程式的處理方式上。
