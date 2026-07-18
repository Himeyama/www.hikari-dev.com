---
title: Public Key Authentication and SSH
tags: [SSH]
image: /img/ogp/2023-10-12-ssh-pubkey.webp
---

Public key authentication is a technique used in encryption and digital signatures that uses two keys, a public key and a private key, to authenticate communication partners and perform encryption.
SSH stands for Secure Shell and is a protocol for securely exchanging commands and files over a network. SSH allows you to log in to a server using public key authentication.

Let's explain how it works specifically.

This article does not refer to mathematics.

## About Public and Private Keys

Public key authentication uses two keys: a public key and a private key.
As the name suggests, the public key is a key that anyone can know, and you send it to your communication partner or make it publicly available on the internet.
The private key is a key that only you possess and must never be revealed to anyone.
It is mathematically very difficult to derive the private key from the public key.
This property is utilized to realize encryption and digital signatures.

### Digital Signatures

Digital signatures are a technology to prove that the sender of data is the person themselves.
Digital signatures are performed with the following steps:

#### Sender
1. Hash the text.
2. Encrypt the hash with the private key (electronic signature).
3. Send the text and the electronic signature.

#### Receiver
4. Receive the text and the electronic signature.
5. Decrypt the signature with the public key and retrieve the hash.
6. Hash the text and compare it with the hash obtained from the electronic signature (if the hashes are the same, the sender sent the text).

Digital signatures use the private key for signing and the public key for verification.

## About SSH

SSH stands for Secure Shell and is a protocol for securely exchanging commands and files over a network.
SSH allows you to log in to a server using public key authentication. The advantages of SSH are as follows:

- Reduced risk of password leakage and brute-force attacks because you can log in without a password (although you can use a password).
- Data is encrypted, preventing eavesdropping and tampering with communication content.
- Enhances network security and access control using features such as port forwarding and tunneling.

In SSH, public key authentication is performed as follows:

1. The client generates a public key and a private key (`ssh-keygen -t ed25519`).
2. The client registers the client's public key (`~/ .ssh/id_ed25519.pub`) in advance on the server (`~/ .ssh/authorized_keys`).
3. When connecting to the server, the client digitally signs with its private key (`~/ .ssh/id_ed25519`).
4. The server verifies the digital signature with the client's public key (`~/ .ssh/authorized_keys`) and, if it is correct, allows login.

That's a summary of public key authentication and SSH.
By using public key authentication and SSH, you can securely exchange commands and files over a network.