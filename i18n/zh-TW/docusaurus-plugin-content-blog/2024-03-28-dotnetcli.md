---
title: .NET CLI 備忘錄
description: 關於 .NET CLI 的備忘錄
authors: hikari
tags: [.NET, CLI]
image: /img/ogp/2024-03-28-dotnetcli.png
---

這篇備忘錄記錄了 .NET CLI (命令行界面)。

:::info
.NET CLI 是一個跨平台的工具集，用於開發、構建、運行、發布和管理 .NET 項目。它提供了一組命令行命令，讓你可以在任何支持 .NET 的操作系統（Windows, Linux, macOS）上高效地工作，無需依賴 IDE。
:::

## 1. 基本命令

### A. 建立新專案

`dotnet new` 命令用於建立新專案、配置文件或解決方案。

```bash
dotnet new console -o MyConsoleApp   # 建立一個新的控制台應用程式
dotnet new webapi -o MyWebApi       # 建立一個新的 ASP.NET Core Web API 專案
dotnet new sln -n MySolution        # 建立一個新的解決方案文件
```

-   `-o`：指定輸出目錄（專案名稱）。
-   `-n`：指定解決方案名稱。

### B. 還原依賴

`dotnet restore` 命令還原專案的依賴項和工具。

```bash
dotnet restore
```
通常，`dotnet build`、`dotnet run` 和 `dotnet publish` 命令會隱式執行還原操作。

### C. 構建專案

`dotnet build` 命令編譯專案及其依賴項。

```bash
dotnet build
dotnet build --configuration Release # 以 Release 配置構建
```

### D. 運行專案

`dotnet run` 命令在開發環境中運行專案。它會自動構建專案，然後運行可執行文件。

```bash
dotnet run
```

### E. 測試專案

`dotnet test` 命令運行專案中的單元測試。

```bash
dotnet test
```

### F. 發布專案

`dotnet publish` 命令將應用程式及其依賴項打包為部署單元。

```bash
dotnet publish -c Release -o ./publish # 以 Release 配置發布到 'publish' 目錄
```

-   `-c Release`：指定 Release 配置。
-   `-o ./publish`：指定輸出目錄。

## 2. 專案管理

### A. 添加專案到解決方案

```bash
dotnet sln add MyConsoleApp/MyConsoleApp.csproj
```

### B. 添加參考 (Reference)

將一個專案參考添加到另一個專案：

```bash
cd MyWebApi
dotnet add reference ../MyConsoleApp/MyConsoleApp.csproj
```

### C. 添加套件 (Package)

添加 NuGet 套件到專案：

```bash
dotnet add package Newtonsoft.Json
```

### D. 移除套件

移除 NuGet 套件：

```bash
dotnet remove package Newtonsoft.Json
```

## 3. 工具命令

### A. 管理全局工具

`dotnet tool` 命令用於安裝、列出、更新或卸載 .NET 全局工具。

```bash
dotnet tool install --global dotnet-ef # 安裝 Entity Framework Core CLI 工具
dotnet tool list --global               # 列出所有全局工具
dotnet tool update --global dotnet-ef   # 更新工具
dotnet tool uninstall --global dotnet-ef # 卸載工具
```

## 4. 其他常用命令

### A. 清理專案

`dotnet clean` 命令清理專案的輸出文件。

```bash
dotnet clean
```

### B. 查看信息

`dotnet --info` 顯示有關 .NET SDK 和運行時環境的詳細信息。

```bash
dotnet --info
```

### C. 查看幫助

幾乎所有 `dotnet` 命令都支持 `--help` 選項。

```bash
dotnet new --help
dotnet build --help
```

## 總結

.NET CLI 是一個功能強大且必不可少的工具，它為 .NET 開發者提供了一個高效、跨平台的工作流。無論是從頭開始創建專案、管理依賴、構建、測試還是發布，熟練掌握 .NET CLI 命令都能極大地提高你的開發效率。
