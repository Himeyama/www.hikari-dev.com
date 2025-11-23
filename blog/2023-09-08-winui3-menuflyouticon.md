---
title: Windows App SDK の MenuFlyoutItem でアイコンを使う方法 Microsoft.UI.Xaml.Controls, WinUI3)
tags: [Microsoft.UI.Xaml.Controls, WinUI3, Windows App SDK, MenuFlyoutItem, icon]
authors: hikari
---

## 結論 `<MenuFlyoutItem.Icon>` を使用する

![MenuFlyoutItem](/img/blog/2023-09-08-winui3-menuflyouticon/menuflyoutitemicon.png)

参考: [MenuFlyoutItem.Icon プロパティ](https://learn.microsoft.com/ja-jp/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutitem.icon?view=windows-app-sdk-1.4)

> 例
> 
> ```xml
> <MenuBar>
>     <MenuBarItem Title="File" x:Uid="File">
>         <MenuFlyoutItem x:Name="Open" Text="Open" x:Uid="Open">
>             <MenuFlyoutItem.Icon>
>                 <FontIcon Glyph="&#xED25;" FontFamily="Segoe MDL2 Assets" />
>             </MenuFlyoutItem.Icon>
>             <MenuFlyoutItem.KeyboardAccelerators>
>                 <KeyboardAccelerator Modifiers="Control" Key="O"/>
>             </MenuFlyoutItem.KeyboardAccelerators>
> ```
