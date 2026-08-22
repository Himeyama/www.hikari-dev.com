---
title: Building llama.cpp with CUDA on WSL2 (Fedora)
authors: hikari
tags: [LLM, llama.cpp, WSL2, Fedora, CUDA, GPU]
image: /img/ogp/2026-08-22-wsl2-fedora-llama-cpp-cuda-build.webp
---

Following up on [the earlier article about building llama.cpp with CUDA support on Windows](/blog/2026/08/22/windows-llama-cpp-cuda-build), I tried the same thing on a Fedora 43 environment running under WSL2. Only the toolchain changes — the overall flow is almost identical.

{/* truncate */}

## Environment

- OS: Fedora (on Hyper-V)
- GPU: NVIDIA GeForce RTX 3080 (Ampere, compute capability 8.6)
- GPU driver: passed through from the Windows side (confirmed via `/usr/lib/wsl/drivers`, `/usr/lib/wsl/lib`)
- Compiler: GCC 15.3.1

`nvidia-smi` was already runnable; the CUDA Toolkit (`nvcc` and its libraries) was installed separately.

## Installing the CUDA Toolkit and build tools

Installing the required packages is fully covered by NVIDIA's official dnf repository and `dnf`.

```bash
# Add the official NVIDIA CUDA repository (match your Fedora version)
sudo dnf config-manager addrepo \
  --from-repofile=https://developer.download.nvidia.com/compute/cuda/repos/fedora43/x86_64/cuda-fedora43.repo

# Install the CUDA Toolkit and build tools
sudo dnf install -y cuda-toolkit cmake ninja-build
```

`nvcc` ends up in `/usr/local/cuda/bin`, so add it to PATH.

```bash
export PATH=/usr/local/cuda/bin:$PATH
nvcc --version   # release 13.2 was installed
```

## Fetching the source and building

```bash
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git
cd llama.cpp

cmake -B build -G Ninja \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=86 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build build --config Release -j
```

`CMAKE_CUDA_ARCHITECTURES` depends on the GPU generation: `86` for Ampere (RTX 30xx), `89` for Ada (RTX 40xx). This is the same regardless of OS.

The `cmake` configure log confirms whether CUDA was properly detected.

```
-- Found CUDAToolkit: ... (found version "13.2.86")
-- CUDA Toolkit found
-- Including CUDA backend
```

## Verifying it works

```bash
./build/bin/llama-cli --list-devices
```

```
Available devices:
  CUDA0: NVIDIA GeForce RTX 3080 (10239 MiB, 9069 MiB free)
```

The GPU is correctly recognized. As a quick test, I downloaded a small model (Qwen2.5-0.5B-Instruct, Q4_K_M, roughly 470 MB) and tried inference.

```bash
./build/bin/llama-cli -m qwen2.5-0.5b-instruct-q4_k_m.gguf -p "こんにちは" -n 32 -ngl 99 -st
```

```
> こんにちは
こんにちは！どういたしまして。何か他に質問があればお気軽にお答えいたします。

[ Prompt: 863.5 t/s | Generation: 308.4 t/s ]
```

This is roughly on par with the measured numbers from the Windows article (Prompt: 890.0 t/s / Generation: 311.6 t/s). It seems that for the same RTX 3080-generation architecture, the numbers don't change much across OSes.

## A gotcha

The latest `llama-cli` now starts an internal HTTP server (apparently sharing code with `llama-server`), so even with `-no-cnv` — as used in the Windows article — it still dropped into interactive mode (waiting at the `>` prompt) and never returned.

To get a single-shot generation that actually exits, use **`-st` (`--single-turn`)** instead of `-no-cnv`.

```bash
# hangs
llama-cli -m model.gguf -p "hi" -n 8 -ngl 99 -no-cnv

# exits after a single run
llama-cli -m model.gguf -p "hi" -n 8 -ngl 99 -st
```

## Summary of differences from the Windows version

| Item | Windows | WSL2 (Fedora) |
|---|---|---|
| Installing build tools | winget | dnf |
| Installing CUDA Toolkit | NVIDIA installer (12.4) | NVIDIA dnf repository (13.2) |
| GPU driver | Installed natively on Windows | Passed through from Windows; not installed on Linux |
| Compiler environment | Load MSVC via `vcvars64.bat` | Plain GCC, no extra setup |
| `CMAKE_CUDA_ARCHITECTURES` | GPU-generation dependent (same) | GPU-generation dependent (same) |
| Flag for single-shot generation | `-no-cnv` was enough at the time of writing | `-st` is needed on the latest build |
| Measured performance | 890.0 / 311.6 t/s | 863.5 / 308.4 t/s |

The core of the build steps (CMake options, architecture flag) is the same regardless of OS — the differences show up only in package management and driver handling.
