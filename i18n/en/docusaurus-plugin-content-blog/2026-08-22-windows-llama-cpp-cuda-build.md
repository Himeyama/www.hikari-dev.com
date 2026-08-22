---
title: Building llama.cpp with CUDA on Windows 11
authors: hikari
tags: [LLM, llama.cpp, Windows, CUDA, GPU]
image: /img/ogp/2026-08-22-windows-llama-cpp-cuda-build.webp
---

A record of building [llama.cpp](https://github.com/ggml-org/llama.cpp), the go-to local LLM inference engine, from source on Windows 11 with the CUDA backend enabled for an NVIDIA GPU, through to actually running a model.

{/* truncate */}

## Environment

- OS: Windows 11 Pro
- GPU: NVIDIA GeForce RTX (VRAM 8 GB or more)
- CUDA Toolkit: 12.4 (already installed)
- Shell: PowerShell

## Checking and installing the required tools

Building llama.cpp requires the following.

- Git
- CMake
- Ninja (build system)
- MSVC (the C++ build tools from Visual Studio Build Tools)
- CUDA Toolkit (if using GPU offloading)

Git, the CUDA Toolkit, and Visual Studio Build Tools were already installed in this environment, but CMake and Ninja were not, so they were installed via winget.

```powershell
winget install --id Kitware.CMake -e
winget install --id Ninja-build.Ninja -e
```

The MSVC compiler (`cl.exe`) ships with Visual Studio Build Tools, but it is not on PATH in a regular PowerShell session. The environment variables need to be loaded via `vcvars64.bat` before building.

```powershell
cmd /c '"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && <build command here>'
```

## Getting the source

```powershell
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git C:\path\to\llama.cpp
```

The full history isn't needed, so a shallow clone with `--depth 1` is sufficient. The repository has a large number of files, and a full clone can take longer than expected, so keep that in mind.

## Configuring the build with CMake

Configure the build with the CUDA backend enabled and the GPU architecture (Compute Capability) specified. Use `86` for Ampere (RTX 30xx) and `89` for Ada Lovelace (RTX 40xx), adjusting the value to match the GPU.

```powershell
cmake -B build -G Ninja `
  -DGGML_CUDA=ON `
  -DCMAKE_CUDA_ARCHITECTURES=86 `
  -DCMAKE_BUILD_TYPE=Release
```

If the configure log shows the following, the CUDA backend has been recognized correctly.

```
-- Found CUDAToolkit: ... (found version "12.4.131")
-- CUDA Toolkit found
-- Including CUDA backend
```

An `OpenSSL not found` warning may appear, but this only disables HTTPS support in the server and has no effect on normal local use.

## Building

```powershell
cmake --build build --config Release -j
```

Compiling CUDA kernels on top of the CPU code generation takes anywhere from a few minutes to over ten, depending on the machine. Once it finishes, the various executables are generated under `build\bin\`. The main ones are:

- `llama-cli.exe` — interactive CLI
- `llama-server.exe` — OpenAI-compatible API server + WebUI
- `llama-quantize.exe` — model quantization tool
- `llama-bench.exe` — benchmarking tool

During the build, `npm ci` for the WebUI assets failed due to a Node.js version mismatch. This didn't stop the build itself — it fell back to downloading pre-built UI assets hosted on Hugging Face — so there was no need to worry about the Node.js version.

## Verifying it works

Once the build succeeds, verify it works with a lightweight GGUF model. Here, a small model on Hugging Face (0.5B, Q4_K_M quantization, just under 500 MB) was used.

```powershell
.\build\bin\llama-cli.exe -m .\models\test-model-q4_k_m.gguf -p "こんにちは" -n 32 -ngl 99
```

`-ngl 99` offloads all layers to the GPU. Running this produced a natural Japanese response, and the log showed a speed like the following.

```
[ Prompt: 890.0 t/s | Generation: 311.6 t/s ]
```

This was dramatically faster than CPU-only inference, confirming that CUDA offloading was working correctly.

## Testing in server mode

Starting `llama-server.exe` brings up an OpenAI-compatible REST API and WebUI.

```powershell
.\build\bin\llama-server.exe -m .\models\test-model-q4_k_m.gguf -ngl 99
```

After starting it, the health check and Chat Completions API were tested from PowerShell.

```powershell
# Health check
Invoke-WebRequest -Uri "http://127.0.0.1:8080/health" -UseBasicParsing

# Chat Completions (OpenAI-compatible)
$body = @{
  messages = @(@{role="user"; content="こんにちは、あなたは誰ですか？簡潔に答えてください。"})
  max_tokens = 64
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
```

`/health` returned `200 OK`, and Chat Completions returned a natural response with a token breakdown in `usage`, confirming it can be used almost exactly like the OpenAI API. The bundled WebUI is also available by visiting `http://127.0.0.1:8080/` in a browser.

## Summary

Even on Windows 11, a CUDA build environment for llama.cpp could be set up with the following flow.

1. Install CMake / Ninja via winget
2. Configure and build with CMake while loading the MSVC environment via `vcvars64.bat`
3. Set `CMAKE_CUDA_ARCHITECTURES` to match the GPU
4. Verify both the CLI and server work with a small model

Once the environment is set up, running local LLM inference is as easy as swapping the model. The key is adjusting the quantization level and the number of offloaded layers (`-ngl`) to match the available VRAM.
