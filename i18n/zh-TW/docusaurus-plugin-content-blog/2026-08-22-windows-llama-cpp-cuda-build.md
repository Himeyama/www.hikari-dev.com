---
title: 在 Windows 11 上編譯 llama.cpp 並啟用 CUDA 的紀錄
authors: hikari
tags: [LLM, llama.cpp, Windows, CUDA, GPU]
image: /img/ogp/2026-08-22-windows-llama-cpp-cuda-build.webp
---

這是一份在 Windows 11 環境下，將本機 LLM 推理引擎的代表作 [llama.cpp](https://github.com/ggml-org/llama.cpp) 從原始碼編譯、啟用 NVIDIA GPU 的 CUDA 後端，並實際執行模型的紀錄。

{/* truncate */}

## 環境

- 作業系統: Windows 11 Pro
- GPU: NVIDIA GeForce RTX (VRAM 8 GB 以上)
- CUDA Toolkit: 12.4 (已安裝)
- Shell: PowerShell

## 確認並安裝所需工具

編譯 llama.cpp 需要以下工具。

- Git
- CMake
- Ninja (建置系統)
- MSVC (Visual Studio Build Tools 中的 C++ 建置工具)
- CUDA Toolkit (若要使用 GPU 卸載)

這次的環境中 Git、CUDA Toolkit、Visual Studio Build Tools 都已安裝，但 CMake 和 Ninja 沒有安裝，因此透過 winget 安裝。

```powershell
winget install --id Kitware.CMake -e
winget install --id Ninja-build.Ninja -e
```

MSVC 編譯器 (`cl.exe`) 雖然包含在 Visual Studio Build Tools 中，但一般的 PowerShell 工作階段並沒有將其加入 PATH。編譯時需要透過 `vcvars64.bat` 載入環境變數。

```powershell
cmd /c '"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" && <接續的編譯指令>'
```

## 取得原始碼

```powershell
git clone --depth 1 https://github.com/ggml-org/llama.cpp.git C:\path\to\llama.cpp
```

不需要完整歷史紀錄，使用 `--depth 1` 的淺層複製 (shallow clone) 就足夠。這個儲存庫的檔案數量很多，完整複製可能會比想像中花更多時間，需要留意。

## 使用 CMake 設定建置

啟用 CUDA 後端，並指定 GPU 的架構 (Compute Capability) 進行組態設定。Ampere 世代 (RTX 30xx) 使用 `86`，Ada Lovelace 世代 (RTX 40xx) 則使用 `89`，依 GPU 調整數值。

```powershell
cmake -B build -G Ninja `
  -DGGML_CUDA=ON `
  -DCMAKE_CUDA_ARCHITECTURES=86 `
  -DCMAKE_BUILD_TYPE=Release
```

若組態記錄中出現以下內容，代表 CUDA 後端已被正確辨識。

```
-- Found CUDAToolkit: ... (found version "12.4.131")
-- CUDA Toolkit found
-- Including CUDA backend
```

過程中可能會出現 `OpenSSL not found` 的警告，這只是代表 server 的 HTTPS 支援被停用，對一般的本機使用沒有影響。

## 執行編譯

```powershell
cmake --build build --config Release -j
```

除了 CPU 用的程式碼產生外，也會編譯 CUDA 核心，因此需要數分鐘到十幾分鐘不等的時間。完成後，會在 `build\bin\` 底下產生各種執行檔，主要有以下幾個。

- `llama-cli.exe` — 互動式 CLI
- `llama-server.exe` — 相容 OpenAI 的 API 伺服器 + WebUI
- `llama-quantize.exe` — 模型量化工具
- `llama-bench.exe` — 效能測試工具

編譯過程中，WebUI 資源的 `npm ci` 曾因 Node.js 版本不符而失敗，但這並不會讓整個編譯停止，而是會改為下載託管在 Hugging Face 上的預先建置 UI 資源，因此不需要在意 Node.js 的版本。

## 確認運作

編譯成功後，用一個輕量的 GGUF 模型確認運作。這次使用的是 Hugging Face 上的小型模型 (0.5B、Q4_K_M 量化、將近 500 MB)。

```powershell
.\build\bin\llama-cli.exe -m .\models\test-model-q4_k_m.gguf -p "こんにちは" -n 32 -ngl 99
```

`-ngl 99` 是將所有層都卸載到 GPU 的參數。執行後回傳了自然的日文回應，記錄檔中顯示了如下的速度。

```
[ Prompt: 890.0 t/s | Generation: 311.6 t/s ]
```

比起純 CPU 推理快上許多，確認 CUDA 卸載正確運作。

## 在伺服器模式下測試

啟動 `llama-server.exe` 後，會啟動相容 OpenAI 的 REST API 與 WebUI。

```powershell
.\build\bin\llama-server.exe -m .\models\test-model-q4_k_m.gguf -ngl 99
```

啟動後，透過 PowerShell 呼叫健康檢查與 Chat Completions API 確認運作。

```powershell
# 健康檢查
Invoke-WebRequest -Uri "http://127.0.0.1:8080/health" -UseBasicParsing

# Chat Completions (相容 OpenAI)
$body = @{
  messages = @(@{role="user"; content="こんにちは、あなたは誰ですか？簡潔に答えてください。"})
  max_tokens = 64
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8080/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
```

`/health` 回傳了 `200 OK`，Chat Completions 也回傳了自然的回應，`usage` 中包含 token 數的明細，確認幾乎可以用和 OpenAI API 相同的方式使用。在瀏覽器開啟 `http://127.0.0.1:8080/` 也能使用內建的 WebUI。

## 總結

即使在 Windows 11 上，也能透過以下流程建置 llama.cpp 的 CUDA 編譯環境。

1. 透過 winget 安裝 CMake / Ninja
2. 透過 `vcvars64.bat` 載入 MSVC 環境，並進行 CMake 組態設定與編譯
3. 依照 GPU 指定 `CMAKE_CUDA_ARCHITECTURES`
4. 用小型模型確認 CLI 與伺服器兩者皆能正常運作

環境建置完成後，之後只要更換模型就能輕鬆嘗試本機 LLM 推理。依照 VRAM 容量調整量化等級與卸載的層數 (`-ngl`) 是其中的重點。
