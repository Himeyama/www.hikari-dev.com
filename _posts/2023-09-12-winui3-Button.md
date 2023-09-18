---
title: Windows App SDK (WinUI3) の Button コンポーネントとサンプル
layout: post
tags: [Microsoft.UI.Xaml.Component, WinUI3, Windows App SDK]
---

## 名前空間
[`Microsoft.UI.Xaml.Controls`](https://learn.microsoft.com/ja-jp/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls)

## 普通のボタン
![Button](/assets/img/Microsoft.UI.Xaml.Component/Button/Button.png)

```xml
<Button Content="Button" />
```

## 絵文字入りのボタン
![Button with icon](/assets/img/Microsoft.UI.Xaml.Component/Button/ButtonWithICON.png)

```xml
<Button>
    <StackPanel Orientation="Horizontal">
        <FontIcon Glyph="&#xED25;" FontFamily="Segoe MDL2 Assets" />
        <TextBlock Text="Open" Margin="8, 0, 0, 0" />
    </StackPanel>
</Button>
```

## 強調スタイルのボタン
![AccentStyleButton](/assets/img/Microsoft.UI.Xaml.Component/Button/AccentStyleButton.png)

```xml
<Button Style="{StaticResource AccentButtonStyle}" Content="Accent style button" />
```

## 幅いっぱいに伸ばす
![Stretch Button](/assets/img/Microsoft.UI.Xaml.Component/Button/StretchButton.png)

```xml
<Button Content="Button" HorizontalAlignment="Stretch" />
```

## ボタンの無効化
![Disabled Button](/assets/img/Microsoft.UI.Xaml.Component/Button/DisabledButton.png)

```xml
<Button IsEnabled="False" Content="Button" />
```

C# では `ボタン.IsEnabled = 真偽値;` で有効化 / 無効化が可能。

## ボタンを非表示
`Visibility="Collapsed"` でコンポーネントが無くなったように見える。`Visibility="Visible"` で表示。

```xml
<Button Name="Btn" Content="Button" Visibility="Collapsed" />
```

無効化されたボタンを C# で表示 / 非表示するには、以下のようにする。

```csharp
/* 表示 */
Btn.Visibility = Visibility.Visible;

/* 非表示 */
Btn.Visibility = Visibility.Collapsed;
```


## 関数の呼び出し

### C#
```csharp
void Button_Click(object sender, RoutedEventArgs e)
{
    // 処理
}
```

### XAML
```xml
<Button Click="Button_Click" Content="Button" />
```

