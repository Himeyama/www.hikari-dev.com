---
title: EC2 Instance Connect 總結
authors: hikari
tags: [AWS]
image: /img/blog/2025-04-29-aws-instance-connect/InstanceConnect.drawio.png
---

## EC2 Instance Connect 是什麼
EC2 Instance Connect 是用來簡化對 AWS EC2 執行個體的 SSH 連線的服務。

過去的 SSH 連線方式需要事先在執行個體放置公開金鑰，但使用 EC2 Instance Connect 可以將臨時的 SSH 公開金鑰傳送到執行個體以建立連線。（不過，除部分 AMI 外，需要安裝 Instance Connect 的套件）

## 連線到執行個體的方法
連線到執行個體的方法有好幾種。

![](/img/blog/2025-04-29-aws-instance-connect/InstanceConnect.drawio.png)

### ① 直接從網際網路連線（與 Instance Connect 無關）
直接從網際網路連線的方式需要經由 Internet Gateway 或 NAT Gateway，且需要公有 IP 位址，因此若限定在私有網路則無法使用。

可以直接使用 ssh 指令，因此是最簡單的方式。

```bash
ssh <使用者名稱>@<公有 IP 位址>
```

### ② 透過 EC2 Instance Connect 端點的連線

使用 AWS CLI 並透過 EC2 Instance Connect 端點連線時，不需要公有 IP 位址。

另外，還可以省下那部分的費用（每月數百日圓）。

使用 AWS CLI 可用類似下面的指令連線，但需事先匯入金鑰對並為執行個體設定金鑰對。

例如可以使用以下指令：

```bash
aws ec2-instance-connect ssh --private-key-file .ssh/id_ed25519 --os-user <使用者名稱> --instance-id <執行個體 ID> --connection-type eice
```

※ 不過，要事先取得存取金鑰並用 `aws configure` 設定好。

如果不想讓執行個體連到網際網路，且想使用非官方 AMI，採用此連線方式最合適。

### ③ 從 AWS 管理主控台用 Instance Connect 連線

若是 Amazon Linux 或 Ubuntu，只要建立 Instance Connect 端點，就可以從管理主控台連到執行個體。

不過，除部分 AMI 外，仍需安裝 Instance Connect 的套件。

詳情請見：https://docs.aws.amazon.com/ja_jp/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html

### ④ 其他連線方式

#### 透過 Session Manager 連線
需為 Session Manager 建立兩個端點，並將允許透過 Session Manager 連線的 IAM 角色附加到執行個體。

此外，除部分 AMI 外，需安裝 Session Manager 的套件。

#### 透過 EC2 序列埠主控台 (Serial Console) 連線
使用序列埠主控台可以直接連到執行個體。請注意，若未設定密碼就無法登入。

## 安全性設定

### 網路 ACL（執行個體所在子網）
預設會允許所有流量，因此若使用預設設定通常不需要特別調整。

以下列出最基本需要的設定。

#### 入站規則
入站規則需允許 SSH（22）。

因為執行個體的 SSH 伺服器預設使用 22 埠，故需允許該埠。

#### 出站規則
出站規則需允許自訂 TCP（1024-65535）。

1024-65535 是 SSH 連線時客戶端會使用的埠範圍。

### 安全性群組（執行個體）
#### 入站規則
入站規則需允許 SSH（22）。

**此設定為必要。**

### 出站規則
安全性群組是有狀態（stateful）的，所以通常不需要設定出站規則。

### 安全性群組（EC2 Instance Connect 端點）
#### 入站規則
因為為有狀態，通常不需要設定入站規則。

#### 出站規則
需允許 SSH（22）。

因為要對執行個體的 22 埠進行通訊，所以必須允許此埠。