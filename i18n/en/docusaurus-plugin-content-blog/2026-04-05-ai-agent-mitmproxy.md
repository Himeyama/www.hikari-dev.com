---
title: Inspecting AI Coding Tool Traffic with mitmproxy
authors: hikari
tags: [AI, API]
image: /img/ogp/2026-04-05-ai-agent-mitmproxy.webp
---

By setting up mitmproxy as a man-in-the-middle proxy, you can monitor the API traffic that AI coding tools make in real time.

{/**/}

## How It Works

Many AI coding tools are Node.js applications that communicate with external APIs over HTTPS. By inserting mitmproxy as a man-in-the-middle proxy and configuring Node.js to trust the mitmproxy CA certificate, you can decrypt the encrypted traffic and inspect it in real time.

## Installation

The easiest way to install mitmproxy is via `uv`.

```ps1
uv tool install mitmproxy
```

## Proxy Configuration

Set the following environment variables before launching the tool.

```ps1
$env:HTTPS_PROXY = "http://127.0.0.1:8080"
$env:HTTP_PROXY  = "http://127.0.0.1:8080"
$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.mitmproxy\mitmproxy-ca-cert.pem"
```

### About NODE_EXTRA_CA_CERTS

Setting only `HTTPS_PROXY` and `HTTP_PROXY` will cause Node.js TLS verification to fail. mitmproxy uses a self-signed certificate when relaying HTTPS traffic, which Node.js rejects by default.

By specifying the path to the mitmproxy CA certificate in `NODE_EXTRA_CA_CERTS`, Node.js will trust it and the connection will succeed.

### Generating the CA Certificate

mitmproxy automatically generates a CA certificate on first launch and saves it to `~\.mitmproxy\`. If you haven't generated it yet, simply start mitmproxy once.

```ps1
mitmweb
```

A browser window opens automatically, showing the proxy management UI at `http://127.0.0.1:8081`.

## Launching the Tool

Launch the tool in a separate terminal with the environment variables set.

Once you start using the tool, requests will appear in the mitmweb UI.

## Captured Traffic

### Endpoint

The tool sends requests to the following endpoint.

```
POST https://api.example.com/v1/messages
```

### Request Headers

```http
x-service-version: ...
content-type: application/json
x-api-key: sk-...
```

### Request Body

```json
{
  "model": "model-name",
  "max_tokens": 16000,
  "stream": true,
  "system": [
    {
      "type": "text",
      "text": "..."
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "..."
    }
  ],
  "tools": [
    {
      "name": "Read",
      "description": "...",
      "input_schema": {}
    }
  ]
}
```

Streaming responses are received in Server-Sent Events (SSE) format with `stream: true`.

### Response

```
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
...
data: {"type":"message_stop"}
```

## What You Can Learn

| Item | Details |
|------|---------|
| API endpoint | `api.example.com/v1/messages` |
| Authentication | API key (`x-api-key` header) |
| Streaming | SSE format |
| Tool definitions | Included in every request |
| System prompt | Thousands to tens of thousands of tokens |

The system prompt contains the AI coding tool's operating principles, descriptions of available tools, and usage guidelines.

## Summary

- The key is trusting the mitmproxy CA certificate in Node.js via `NODE_EXTRA_CA_CERTS`
- API communication uses SSE streaming
- You can inspect the internal structure of AI coding tools, including tool definitions and the system prompt
