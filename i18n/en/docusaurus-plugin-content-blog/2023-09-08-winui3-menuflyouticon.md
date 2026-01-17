---
title: How to use icons with MenuFlyoutItem in Windows App SDK (Microsoft.UI.Xaml.Controls, WinUI3)
---

## Conclusion Use `<MenuFlyoutItem.Icon>`

![MenuFlyoutItem](/img/blog/2023-09-08-winui3-menuflyouticon/menuflyoutitemicon.png)

Reference: [MenuFlyoutItem.Icon property](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.menuflyoutitem.icon?view=windows-app-sdk-1.4)

> Example
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
