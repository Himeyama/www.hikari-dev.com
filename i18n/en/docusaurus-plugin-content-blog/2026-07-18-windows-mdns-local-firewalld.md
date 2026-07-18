---
title: Solving mDNS (hostname.local) resolution failures from Windows to a Linux machine on the same LAN
authors: hikari
tags: [Linux, Windows, ネットワーク, Fedora]
image: /img/ogp/2026-07-18-windows-mdns-local-firewalld.webp
---

I ran into a case where trying to reach a Fedora Server machine on the same LAN via `myhost.local` (mDNS) failed name resolution only. By capturing packets directly with tcpdump, I traced the cause to firewalld blocking inbound mDNS traffic.

{/* truncate */}

## Environment

- Client: Windows 11
- Server: Fedora Server (Linux)
- Both on the same LAN (e.g. Windows machine `192.0.2.10`, Linux machine `192.0.2.20`)
- A web server running on port 3000 on the Linux machine

## What I wanted to do

Instead of typing an IP address directly, I wanted to use mDNS (Avahi) to access it as follows.

```
http://myhost.local:3000
```

## Prerequisite: install Avahi on the Linux machine

Fedora Server doesn't ship with Avahi installed by default, so install it first.

```bash
sudo dnf install avahi
sudo systemctl enable --now avahi-daemon
```

Once it's running, `journalctl -u avahi-daemon` should show logs like the following, confirming the hostname is being advertised.

```
Registering new address record for 192.0.2.20 on eth0.IPv4.
```

Even at this point, a separate firewalld configuration is still needed, as described below.

## Symptoms

- `http://192.0.2.20:3000` → accessible (the web server, port, and IP connectivity are all fine)
- `ping myhost.local` → "host not found"
- `nslookup myhost.local` → non-existent domain
- avahi-daemon on the Linux machine is running, and it is logging that it's advertising the hostname (as above)
- The Linux machine's firewalld already has the required ports open, such as `3000/tcp`

At first glance, both the Linux machine and the Windows machine looked fine, yet only name resolution was failing.

## Isolating the problem

### 1. Is the mDNS client on Windows working?

```powershell
netstat -ano -p udp | findstr 5353
```

I confirmed that Windows' Dnscache service (the DNS client) is listening on UDP 5353. Windows 10 (1703 and later) and Windows 11 include built-in mDNS client support.

:::note Aside
You might wonder, "a Raspberry Pi shows up as `raspberrypi.local` without any extra setup, so why doesn't Fedora?" The reason is simple: Raspberry Pi OS ships with Avahi preinstalled, and its default firewall configuration (in fact, `iptables`/`nftables` filtering is essentially disabled out of the box) doesn't block mDNS traffic. Fedora Server, on the other hand, doesn't ship with Avahi installed at all, and firewalld is designed by default to open only the minimum necessary ports. In other words, the difference isn't about "how well Windows supports it," but about "how strict each Linux distribution's default configuration is."
:::

### 2. Is Avahi on the Linux machine listening?

```bash
sudo ss -lunp | grep 5353
```

```
UNCONN 0 0 0.0.0.0:5353  users:(("avahi-daemon",...))
UNCONN 0 0    [::]:5353  users:(("avahi-daemon",...))
```

I confirmed it was listening correctly on both IPv4 and IPv6.

### 3. Are packets actually arriving? (this is the crux)

I set up tcpdump on the Linux machine, then tried resolving the name from Windows while capturing.

```bash
sudo tcpdump -ni eth0 port 5353
```

```powershell
Resolve-DnsName -Name myhost.local
```

:::note Note
A plain `ping myhost.local` command turned out not to send an mDNS query in some implementations. Using `Resolve-DnsName` (via the DNS client API) reliably sends an mDNS query. Even if `ping` alone reports "not found," that doesn't necessarily mean mDNS itself isn't working.
:::

The capture showed the following.

```
192.0.2.10.mdns > 224.0.0.251.mdns: A (QM)? myhost.local.
```

The query from the Windows side was arriving at the Linux machine. However, no response packet from Avahi was captured at all.

At this point, the network path and the client-side functionality on Windows could be ruled out. The problem was narrowed down to the query being dropped somewhere on the Linux machine.

## Root cause

I checked the allow list in firewalld on the Linux machine.

```bash
sudo firewall-cmd --list-all
```

```
services: cockpit dhcpv6-client ssh
ports: 3000/tcp 4321/tcp 5173/tcp ...
```

UDP 5353 (mDNS) wasn't allowed anywhere.

The multicast advertisement packets that Avahi itself sends out (outbound) were being observed without any issue, which made things look fine at first glance. But incoming mDNS queries from the outside (inbound) were being blocked by firewalld and never reaching avahi-daemon. Because mDNS silently times out when no response comes back, the error messages gave no clue at all as to the actual cause.

## Fix

Add the predefined firewalld service `mdns`.

```bash
# Verify it works (runtime only, cleared on reboot)
sudo firewall-cmd --zone=<zone-name> --add-service=mdns

# Make it permanent
sudo firewall-cmd --zone=<zone-name> --add-service=mdns --permanent
```

The `mdns` service definition looks like this, and it's a safe rule that restricts the destination to the multicast address.

```
mdns
  ports: 5353/udp
  destination: ipv4:224.0.0.251 ipv6:ff02::fb
```

After applying it, the problem was resolved immediately.

```powershell
Resolve-DnsName myhost.local
# → returns 192.0.2.20

ping myhost.local
# → gets a response

curl http://myhost.local:3000
# → 200 OK
```

## Takeaways

1. "Being able to send multicast packets yourself" and "being able to receive multicast packets" are two separate problems. Firewalls behave asymmetrically for outbound and inbound traffic, so one working doesn't guarantee the other is working too.
2. Don't judge mDNS connectivity based on `ping` alone. On Windows, using `Resolve-DnsName` lets you reliably confirm what kind of name resolution query is actually being sent.
3. Capturing actual packets with tcpdump is the fastest way to isolate the problem. No matter how normal the logs or service status look, directly observing on both sides whether "the query is arriving" and "the response is coming back" is the quickest path to an answer.
4. When adding a service in firewalld, using a predefined service like `mdns`, whose destination is restricted to a multicast address, avoids opening more than necessary.
5. Just installing and starting Avahi isn't enough. Depending on the distribution, the firewall may be enabled and strict by default (Fedora's firewalld is a prime example), and even if Avahi's own configuration is correct, mDNS won't work unless firewalld is separately configured to allow it. That's the key difference from distributions like Raspberry Pi OS, where the firewall is loose or disabled.
