---
title: Building a DNS Cache + Ad-Blocking Server for My Home LAN with dnsmasq
authors: hikari
tags: [Linux, ネットワーク, Fedora, SELinux]
image: /img/ogp/2026-07-19-dnsmasq-lan-adblock-dns.webp
---

I set up a DNS server for my home LAN to speed up name resolution while also blocking ads. Upstream is Cloudflare's `1.1.1.1`. Instead of Pi-hole, I got it all done with the lightweight dnsmasq that was already installed. This is a record of the process, including the SELinux issue I ran into along the way.

{/* truncate */}

> The IPs and hostnames in this article are placeholders. Substitute your own environment's values.
>
> | Placeholder | Meaning |
> |---|---|
> | `192.168.0.0/24` | Home LAN subnet |
> | `192.168.0.10` | This server's LAN IP |
> | `eth0` | The server's LAN interface name |

## Why build this

- Speed: caching frequently accessed domains locally makes subsequent lookups nearly instant.
- Ad blocking: blocking ad and tracker domains at the DNS level removes ads on every device on the LAN (including phones) with no app installation required.
- Upstream is 1.1.1.1: a fast, privacy-conscious resolver that's a solid default choice.

## Design decisions

| Item | Choice | Reason |
|---|---|---|
| Software | dnsmasq | Already installed and lightweight. Handles caching, forwarding, and hosts-format blocking in one package |
| Upstream | `1.1.1.1` / `1.0.0.1` (plain UDP 53) | Kept the setup minimal and simple. Encryption (DoT) was skipped this time |
| Blocklist | [StevenBlack unified hosts](https://github.com/StevenBlack/hosts) | A standard choice. About 80,000 domains in `0.0.0.0 domain` format |
| Exposure scope | LAN only | Restrict the source to the subnet via the firewall (to prevent becoming an open resolver) |

The environment is Fedora Server with SELinux Enforcing. I left the host's DNS configuration (`systemd-resolved`) completely untouched, and kept dnsmasq purely as an independent "LAN-facing service."

## Point 1: Not fighting systemd-resolved for port 53

On Fedora, `systemd-resolved` holds port 53 on `127.0.0.53`. If dnsmasq tries to listen on `0.0.0.0:53` (all interfaces), it collides and fails to start.

So I restricted the listen address to the LAN IP and loopback, and used `bind-dynamic` to bind them individually.

```conf
# /etc/dnsmasq.d/adblock-cache.conf
interface=eth0
listen-address=127.0.0.1
bind-dynamic
```

This way, dnsmasq only claims `192.168.0.10:53` and `127.0.0.1:53`, and can coexist with resolved on `127.0.0.53`.

## dnsmasq configuration (complete)

```conf
# --- Listening (avoid conflicting with resolved) ---
interface=eth0
listen-address=127.0.0.1
bind-dynamic

# --- Pin upstream to 1.1.1.1 (don't read /etc/resolv.conf) ---
no-resolv
server=1.1.1.1
server=1.0.0.1
server=2606:4700:4700::1111
server=2606:4700:4700::1001

# --- Caching (for speed) ---
cache-size=10000
min-cache-ttl=60

# --- Behavior ---
domain-needed # don't forward names without a dot to upstream
bogus-priv # don't leak private reverse lookups externally
no-hosts # don't read the host's /etc/hosts
addn-hosts=/etc/dnsmasq-blocklist.hosts # ad blocklist
```

The ad-blocking mechanism is simple: just have `addn-hosts` load StevenBlack's hosts file (a list of `0.0.0.0 ads.example.com` entries). Queries for those domains get `0.0.0.0` back, so the client never reaches the ad server.

## Pitfall 1: `bad option at line 15`

At first I placed the blocklist at `/etc/dnsmasq.d/blocklist.hosts`, and the startup check complained:

```
dnsmasq: bad option at line 15 of /etc/dnsmasq.d/blocklist.hosts
```

The cause was this line in `dnsmasq.conf`:

```conf
conf-dir=/etc/dnsmasq.d,.rpmnew,.rpmsave,.rpmorig
```

`conf-dir` loads every file under the specified directory as a configuration file (the only exclusion is by extension). That means even the hosts-format blocklist got parsed as "configuration," causing a syntax error on the `127.0.0.1 localhost` line.

Fix: place the blocklist outside of `/etc/dnsmasq.d/` (at `/etc/dnsmasq-blocklist.hosts`). Since `addn-hosts` takes a full path, the location doesn't matter as long as it's outside that directory.

## Pitfall 2: SELinux `Permission denied`

After moving the file and restarting, the syntax check passed, but the log showed this and blocking wasn't working:

```
dnsmasq: failed to load names from /etc/dnsmasq-blocklist.hosts: Permission denied
```

The file was `644 root:root`, so it should have been world-readable. Yet Permission denied. The culprit was SELinux.

My setup script downloaded the file to a temporary location with `curl`, then `mv`'d it into place. That `mv` was the problem: it carries over the temp file's SELinux label `user_tmp_t`. The dnsmasq process (`dnsmasq_t`) can't read files labeled `user_tmp_t`.

```console
$ ls -Z /etc/dnsmasq-blocklist.hosts
unconfined_u:object_r:user_tmp_t:s0   /etc/dnsmasq-blocklist.hosts   # this is the cause
$ ls -Z /etc/dnsmasq.conf
system_u:object_r:dnsmasq_etc_t:s0    /etc/dnsmasq.conf              # what the label should look like
```

Fix: restore the correct label (`etc_t`) with `restorecon`.

```console
$ sudo restorecon -Fv /etc/dnsmasq-blocklist.hosts
Relabeled /etc/dnsmasq-blocklist.hosts from unconfined_u:object_r:user_tmp_t:s0 to system_u:object_r:etc_t:s0
$ sudo systemctl restart dnsmasq
```

After restarting, the log showed it was finally read successfully.

```
dnsmasq: read /etc/dnsmasq-blocklist.hosts - 80886 names
```

> Lesson learned: on SELinux systems, `mv` carries the label along with it. Make it a habit to run `restorecon` whenever you place an externally sourced file under `/etc`. I also built `restorecon` into the auto-update script.

## Restrict the firewall to the LAN

Opening port 53 unconditionally turns the server into an open resolver reachable from the outside (a DDoS amplification risk). Even though the server sits behind a home router and isn't directly exposed to the internet, restricting the source to the subnet adds a layer of defense in depth.

```bash
firewall-cmd --permanent \
  --add-rich-rule='rule family=ipv4 source address=192.168.0.0/24 service name=dns accept'
firewall-cmd --reload
```

## Automatic updates

Since the blocklist is updated frequently, I set it to refresh automatically once a week. A systemd timer (`OnCalendar=weekly`) triggers the update script, and only reloads dnsmasq (`systemctl reload dnsmasq`) when the fetch succeeds. If the fetch fails, the old list is kept in place as a safety measure.

## Verification

```console
# Is it listening on the LAN IP?
$ ss -tulnp | grep 192.168.0.10:53
udp  UNCONN  192.168.0.10:53
tcp  LISTEN  192.168.0.10:53

# Name resolution works
$ dig @192.168.0.10 github.com +short
20.27.177.113

# Caching effect (second query is 0 msec)
$ dig @192.168.0.10 example.com | grep "Query time"
;; Query time: 27 msec
$ dig @192.168.0.10 example.com | grep "Query time"
;; Query time: 0 msec

# Ad domains are blocked (returns 0.0.0.0)
$ dig @192.168.0.10 mediavisor.doubleclick.net +short
0.0.0.0
```

The second lookup for `example.com` dropped from 27ms to 0ms — the cache is working nicely. And ad domains resolve to `0.0.0.0` as intended.

> Incidentally, `dig @192.168.0.10 doubleclick.net` (the bare domain) resolves normally. StevenBlack's list targets specific ad subdomains like `mediavisor.doubleclick.net`, not the top-level domain itself. I briefly panicked when I tested against the wrong target.

## Configuring LAN clients

- Changing the router's DHCP-distributed DNS to `192.168.0.10` applies it across the whole LAN at once (recommended).
- Alternatively, set each device's DNS manually to `192.168.0.10`.

## Summary

- dnsmasq alone was enough to achieve "cache acceleration + ad blocking + LAN-wide availability." Pi-hole wasn't necessary.
- I hit two snags, both distro-specific quirks:
  1. `conf-dir` loads everything underneath as configuration → keep hosts files outside that directory.
  2. SELinux labels left over from `mv` get in the way → restore them with `restorecon`.
- With roughly 80,000 domains blocked, name resolution noticeably got faster too. My phone's ads disappeared, and I'm happy with the result.
