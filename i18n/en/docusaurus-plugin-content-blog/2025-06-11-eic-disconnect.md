---
title: EC2 Instance Connect fails to connect from Windows without a key
---

## Unable to connect to Instance Connect on Windows

```ps1
PS C:\> aws ec2-instance-connect ssh --instance-id i-0aa38de21acf2aa1c --region ap-south-1
Bad permissions. Try removing permissions for user: \\OWNER RIGHTS (S-1-3-4) on file C:/Users/hikari/AppData/Local/Temp/tmpm9m1bf7j/private-key.
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
Permissions for 'C:\\Users\\hikari\\AppData\\Local\\Temp\\tmpm9m1bf7j\\private-key' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Load key "C:\\Users\\hikari\\AppData\\Local\\Temp\\tmpm9m1bf7j\\private-key": bad permissions
ec2-user@192.168.0.4: Permission denied (publickey,gssapi-keyex,gssapi-with-mic).
```

Verification as of 2025/06/11.

## Login is possible from WSL

```ps1
PS C:\> wsl -- aws ec2-instance-connect ssh --instance-id i-0aa38de21acf2aa1c --region ap-south-1
  ,     #_
  ~\_  ####_        Amazon Linux 2023
  ~~  \_#####\
  ~~     \###|
  ~~       \#/ ___   https://aws.amazon.com/linux/amazon-linux-2023
  ~~       V~' '->
   ~~~         /
    ~~._.   _/
      _/ _/
     _/m/'
Last login: Tue Jun 10 22:50:33 2025 from 192.168.0.183
[ec2-user@ip-192-168-0-4 ~]$
```

Why?

## Addendum
Downgrading allowed connection.

I wish they would fix this.

Reference: https://github.com/aws/aws-cli/issues/9114

```
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2-2.17.35.msi
```