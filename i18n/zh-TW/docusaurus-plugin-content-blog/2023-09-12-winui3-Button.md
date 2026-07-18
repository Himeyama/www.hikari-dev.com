---
title: WinUI3 Button
description: 關於 WinUI3 Button 的備忘錄
authors: hikari
tags: [WinUI3, XAML]
image: /img/blog/2023-09-12-winui3-Button/Button.png
---

這篇備忘錄記錄了 WinUI3 中的 `Button` 控制項。

:::info
在 WinUI3 中，`Button` 是一個基本的交互式控制項，允許用戶通過點擊觸發應用程式中的操作。它通常用於提交表單、確認操作、導航或執行其他命令。
:::

## 1. 基本用法

創建一個 `Button` 最簡單的方法是為其提供 `Content` 和處理 `Click` 事件。

```xml
<Button Content="點擊我" Click="MyButton_Click"/>
```

在後台程式碼中 (例如 `MainWindow.xaml.cs`)：

```csharp
// MainWindow.xaml.cs
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace WinUI3App
{
    public sealed partial class MainWindow : Window
    {
        public MainWindow()
        {
            this.InitializeComponent();
        }

        private void MyButton_Click(object sender, RoutedEventArgs e)
        {
            // 在這裡執行按鈕點擊時的操作
            // 例如：
            // MessageDialog dialog = new MessageDialog("按鈕被點擊了！", "提示");
            // await dialog.ShowAsync();
            if (sender is Button button)
            {
                button.Content = "已點擊！";
            }
        }
    }
}
```

## 2. Button 的內容 (Content)

`Button` 的 `Content` 屬性是 `object` 類型，這意味著你可以放置任何 UI 元素作為按鈕的內容，而不僅僅是文本。這使得 `Button` 非常靈活。

### 範例：文本

```xml
<Button Content="提交"/>
```

### 範例：圖標 (Icon)

通常使用 `FontIcon` 或 `SymbolIcon` 來顯示圖標。

```xml
<Button Click="SaveButton_Click">
    <SymbolIcon Symbol="Save"/>
</Button>
```

### 範例：圖標和文本

你可以將 `StackPanel` 或其他佈局容器放置在 `Button` 的 `Content` 中，以組合多個元素。

```xml
<Button Click="NewFileButton_Click">
    <StackPanel Orientation="Horizontal">
        <SymbolIcon Symbol="Document" Margin="0,0,8,0"/>
        <TextBlock Text="新建檔案"/>
    </StackPanel>
</Button>
```

### 範例：自定義圖像

```xml
<Button Click="ImageButton_Click">
    <Image Source="ms-appx:///Assets/CustomIcon.png" Width="24" Height="24"/>
</Button>
```

## 3. 按鈕樣式 (Styling)

WinUI3 提供了多種內置樣式，你可以應用於按鈕，使其具有不同的視覺外觀和用途。

### 範例：主要按鈕 (Primary Button)

`AccentButtonStyle` 通常用於強調主要操作。

```xml
<Button Content="確認" Style="{StaticResource AccentButtonStyle}"/>
```

### 範例：其他標準樣式

WinUI3 提供了其他一些默認樣式，如：
-   `Button` (默認樣式)
-   `TextButtonStyle` (文本按鈕，沒有背景和邊框)
-   `AppBarButtonStyle` (應用程式欄按鈕樣式)

```xml
<Button Content="取消" Style="{StaticResource TextButtonStyle}"/>
```

### 範例：自定義樣式

你可以定義自己的樣式來完全控制按鈕的外觀。

```xml
<Grid>
    <Grid.Resources>
        <Style TargetType="Button" x:Key="CustomButtonStyle">
            <Setter Property="Background" Value="LightBlue"/>
            <Setter Property="Foreground" Value="DarkBlue"/>
            <Setter Property="BorderBrush" Value="DarkBlue"/>
            <Setter Property="BorderThickness" Value="2"/>
            <Setter Property="Padding" Value="12,8"/>
            <Setter Property="CornerRadius" Value="4"/>
            <Setter Property="FontWeight" Value="SemiBold"/>
        </Style>
    </Grid.Resources>

    <Button Content="自定義按鈕" Style="{StaticResource CustomButtonStyle}"/>
</Grid>
```

## 4. 命令綁定 (Commanding)

對於 MVVM (Model-View-ViewModel) 模式，你通常會使用命令綁定而不是直接處理 `Click` 事件。`Button` 支持 `Command` 屬性。

```xml
<Button Content="執行命令" Command="{Binding MyCommand}"/>
```

在你的 ViewModel 中：

```csharp
// ViewModel (例如 MyViewModel.cs)
using CommunityToolkit.Mvvm.Input; // 假設你使用 CommunityToolkit.Mvvm

public class MyViewModel : ObservableObject
{
    public IRelayCommand MyCommand { get; }

    public MyViewModel()
    {
        MyCommand = new RelayCommand(ExecuteMyCommand, CanExecuteMyCommand);
    }

    private void ExecuteMyCommand()
    {
        // 執行命令邏輯
        Console.WriteLine("命令已執行！");
    }

    private bool CanExecuteMyCommand()
    {
        // 判斷命令是否可以執行
        return true;
    }
}
```

## 總結

WinUI3 的 `Button` 控制項是一個功能豐富且高度可自定義的元素。無論是簡單的文本按鈕、帶圖標的複雜按鈕，還是使用命令綁定，它都提供了強大的能力來滿足你的 UI 交互需求。通過樣式化，你可以輕鬆地使其與你的應用程式設計語言保持一致。
