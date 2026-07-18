---
title: WinUI3 MenuFlyoutIcon
description: 關於 WinUI3 MenuFlyoutIcon 的備忘錄
authors: hikari
tags: [WinUI3, XAML]
image: /img/blog/2023-09-08-winui3-menuflyouticon/menuflyoutitemicon.png
---

這篇備忘錄記錄了 WinUI3 中的 `MenuFlyoutIcon`。

:::info
在 WinUI3 中，`MenuFlyoutIcon` 是一個用於在 `MenuFlyoutItem` 中顯示圖標的控制項。它允許你為上下文菜單或主菜單中的項目添加視覺提示，提高用戶界面的可讀性和用戶體驗。
:::

## 1. `MenuFlyoutItem` 和 `Icon`

`MenuFlyoutItem` 是 `MenuFlyout` 中的一個可點擊的項目。它本身有一個 `Icon` 屬性，你可以直接在其中放置圖標控制項。

### 範例：使用 `FontIcon`

最常見的方式是使用 `FontIcon` 顯示一個字體圖標（例如來自 Segoe Fluent Icons 字體）。

```xml
<MenuFlyout>
    <MenuFlyoutItem Text="新建檔案">
        <MenuFlyoutItem.Icon>
            <FontIcon Glyph="&#xE7C3;" /> {/**/}
        </MenuFlyoutItem.Icon>
    </MenuFlyadItem>
    <MenuFlyoutItem Text="開啟檔案">
        <MenuFlyoutItem.Icon>
            <FontIcon Glyph="&#xE8E5;" /> {/**/}
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
    <MenuFlyoutSeparator />
    <MenuFlyoutItem Text="儲存">
        <MenuFlyoutItem.Icon>
            <FontIcon Glyph="&#xE74E;" /> {/**/}
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
</MenuFlyout>
```

你也可以使用 `SymbolIcon` 來引用內置的 `Symbol` 枚舉，這更具可讀性。

```xml
<MenuFlyout>
    <MenuFlyoutItem Text="新建檔案">
        <MenuFlyoutItem.Icon>
            <SymbolIcon Symbol="Document" />
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
    <MenuFlyoutItem Text="開啟檔案">
        <MenuFlyoutItem.Icon>
            <SymbolIcon Symbol="Folder" />
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
    <MenuFlyoutSeparator />
    <MenuFlyoutItem Text="儲存">
        <MenuFlyoutItem.Icon>
            <SymbolIcon Symbol="Save" />
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
</MenuFlyout>
```

### 範例：使用 `BitmapIcon`

如果你想使用圖像文件（例如 PNG 或 SVG）作為圖標，可以使用 `BitmapIcon`。

```xml
<MenuFlyout>
    <MenuFlyoutItem Text="設定">
        <MenuFlyoutItem.Icon>
            <BitmapIcon UriSource="ms-appx:///Assets/SettingsIcon.png" ShowAsMonochrome="False"/>
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
</MenuFlyout>
```

確保 `Assets/SettingsIcon.png` 文件存在於你的專案中。`ShowAsMonochrome="False"` 確保圖像保持其原始顏色。

### 範例：使用 `PathIcon`

對於更複雜或自定義的矢量圖形，可以使用 `PathIcon`。這允許你使用 XAML 語法定義圖形路徑。

```xml
<MenuFlyout>
    <MenuFlyoutItem Text="自定義圖標">
        <MenuFlyoutItem.Icon>
            <PathIcon Data="M10,10 L20,20 M10,20 L20,10" /> {/**/}
        </MenuFlyoutItem.Icon>
    </MenuFlyoutItem>
</MenuFlyout>
```

## 2. 為什麼沒有 `MenuFlyoutIcon` 類？

值得注意的是，你不會在 WinUI3/UWP 的 API 文檔中找到一個名為 `MenuFlyoutIcon` 的直接類。這是因為 `MenuFlyoutItem.Icon` 屬性是一個 `IconElement` 類型，它是一個抽象基類。

因此，你實際上是在 `MenuFlyoutItem.Icon` 屬性中放置任何繼承自 `IconElement` 的具體圖標控制項（如 `FontIcon`、`SymbolIcon`、`BitmapIcon`、`PathIcon`）。這些都是用於顯示圖標的標準 WinUI 控制項，只是在 `MenuFlyoutItem` 的上下文中使用。

## 3. 最佳實踐

-   **一致性**：在整個應用程式中保持圖標樣式和大小的一致性。
-   **可訪問性**：確保圖標清晰可見，並考慮為視力受損用戶提供文本替代。
-   **易於理解**：選擇直觀且普遍認可的圖標來代表其操作。
-   **主題適應性**：如果使用 `FontIcon` 或 `SymbolIcon`，它們通常會自動適應應用程式的主題（淺色/深色模式）。對於 `BitmapIcon`，如果希望它們也能適應，可能需要提供不同主題下的圖像資源。

## 總結

在 WinUI3 中為 `MenuFlyoutItem` 添加圖標是通過其 `Icon` 屬性實現的，該屬性接受任何 `IconElement` 派生類。最常用的是 `FontIcon` 和 `SymbolIcon`，因為它們輕量且易於與應用程式主題集成。正確使用圖標可以顯著提高應用程式的可用性和視覺吸引力。
