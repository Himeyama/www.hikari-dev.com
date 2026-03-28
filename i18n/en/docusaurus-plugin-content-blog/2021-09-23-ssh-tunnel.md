---
title: SSH Tunnel
tags: [SSH, Network]
date: '2021-09-23 15:48'
image: /img/ogp/2021-09-23-ssh-tunnel.png
---

# SSH Tunneling
## Local Port Forwarding
```
ssh -L [client_port]:[host_to_forward]:[host_to_forward_port]
```

> Suppose there is a client A, an SSH server B, and a host C, and you want to forward `C:8080` to port 80 on A.

```sh
ssh -L80:C:8080 B
```

With this forwarding, accessing `http://localhost` from A will display the same content as `http://C:8080` on B.

In summary, even if C is not visible from A, you can access the home network via SSH if port 22 is open to the outside. If B is visible from A, you can forward C's port to A via B.

Using `-g` allows access to `C:8080` from computers on A's network using A's hostname.

## Remote Port Forwarding
```sh
ssh -R [client_port]:[host_to_forward]:[host_to_forward_port]
```

Unlike local forwarding, it forwards ports visible from the client instead of ports visible from the destination.

> Suppose there is a client B, an SSH server A, and a host C, and you want to forward `C:8080` to port 80 on A.

```sh
ssh -R80:C:8080 A
```

With this forwarding, accessing `http://localhost` from A will display the same content as `http://C:8080` on B.

Even if B is not accessible from the outside, if a connection between B and A is established, you can forward the content of C to A. It is often used when you cannot directly operate B. When a connection between B and A is broken, tools like `auto-ssh` are often used to automatically reconnect.