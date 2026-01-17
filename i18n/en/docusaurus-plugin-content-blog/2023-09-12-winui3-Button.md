---
title: Windows App SDK (WinUI3) Button Component and Samples
---

## Namespace
[`Microsoft.UI.Xaml.Controls`](https://learn.microsoft.com/ja-jp/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls)

## Standard Button
![Button](/img/blog/2023-09-12-winui3-Button/Button.png)

```xml
<Button Content="Button" />
```

## Button with an icon
![Button with icon](/img/blog/2023-09-12-winui3-Button/ButtonWithICON.png)

```xml
<Button>
    <StackPanel Orientation="Horizontal">
        <FontIcon Glyph="&#xED25;" FontFamily="Segoe MDL2 Assets" />
        <TextBlock Text="Open" Margin="8, 0, 0, 0" />
    </StackPanel>
</Button>
```

## Accent-styled Button
![AccentStyleButton](/img/blog/2023-09-12-winui3-Button/AccentStyleButton.png)

```xml
<Button Style="{StaticResource AccentButtonStyle}" Content="Accent style button" />
```

## Stretching the button to full width
![Stretch Button](/img/blog/2023-09-12-winui3-Button/StretchButton.png)

```xml
<Button Content="Button" HorizontalAlignment="Stretch" />
```

## Disabling a button
![Disabled Button](/img/blog/2023-09-12-winui3-Button/DisabledButton.png)

```xml
<Button IsEnabled="False" Content="Button" />
```

In C#, you can enable/disable a button using `button.IsEnabled = booleanValue;`.

## Hiding a button
Using `Visibility="Collapsed"` makes the component disappear as if it doesn't exist. Use `Visibility="Visible"` to show it.

```xml
<Button Name="Btn" Content="Button" Visibility="Collapsed" />
```

To show/hide a disabled button in C#, do the following:

```csharp
/* Show */
Btn.Visibility = Visibility.Visible;

/* Hide */
Btn.Visibility = Visibility.Collapsed;
```


## Calling a function

### C#
```csharp
void Button_Click(object sender, RoutedEventArgs e)
{
    // Process
}
```

### XAML
```xml
<Button Click="Button_Click" Content="Button" />
```
