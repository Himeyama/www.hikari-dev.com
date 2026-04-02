---
title: What is CORS? An Explanation of Security for Beginners
authors: hikari
tags: [Web, Security]
image: /img/ogp/2026-04-02-cors-security.png
---

This article explains **CORS (Cross-Origin Resource Sharing)**, a web browser security feature, for beginners, covering "why it's necessary" and "what dangers it entails." Understanding it correctly will enable secure web development.

<!-- truncate -->

## The Background of the Need for CORS: Same-Origin Policy

In the early 1990s, when JavaScript was incorporated into browsers, the concept of web security was almost nonexistent. At that time, malicious websites could freely access data from other sites, making it easy for session hijacking and data theft to occur.

To solve this problem, a restriction known as the **Same-Origin Policy** was introduced. This is a simple yet powerful rule that states, "JavaScript loaded from a web page cannot access data from a different origin."

For example, JavaScript loaded from a page at `https://www.example.com` cannot access data from `https://www.bank.com`. This ensures that even if a user accesses a malicious site while logged into their bank site, their banking information cannot be stolen.

### What is an Origin?

**Origin** is determined by the following three factors:

- **Protocol**: either `http://` or `https://`
- **Host (domain)**: either `example.com` or `api.example.com`
- **Port**: either `80` or `8080`

For example,

| URL | Protocol | Host | Port | Origin |
|-----|----------|--------|--------|----------|
| `https://www.example.com/page` | HTTPS | www.example.com | 443 (default) | `https://www.example.com` |
| `https://api.example.com/data` | HTTPS | api.example.com | 443 (default) | `https://api.example.com` |

Since these are different hosts, they are considered **different origins**.

### What the Same-Origin Policy Prevents

Requests to different origins via JavaScript's **XHR (XMLHttpRequest)** or **Fetch API** are restricted.

Example: A malicious script on evil.com
```javascript
fetch('https://bank.example.com/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ amount: 1000000 })
});
```

Without the Same-Origin Policy, JavaScript from a malicious site (`evil.com`) could send a transfer request while the user is logged into their bank site. **Preventing this scenario is the purpose of the Same-Origin Policy**.

## Why CORS is Necessary

However, modern web design often involves cooperation among multiple origins.

- **Frontend**: `https://www.example.com`
- **API Server**: `https://api.example.com`
- **CDN / Static Files**: `https://cdn.example.com`

These are **operated by the same company and are legitimate communications**. But if restricted by the Same-Origin Policy, the application would not function.

This is where CORS (Cross-Origin Resource Sharing) comes into play.

## What is CORS: Explicitly Allowing Access

**CORS is a mechanism by which the server explicitly declares, "requests from this origin are permitted."**

By simply returning the following response headers, the browser can relax the restrictions.

```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Unless the server says "allowed," the browser will not pass the results of the request back to JavaScript**. This achieves cross-origin access while maintaining security.

## Security Risks of CORS: Common Configuration Mistakes

Although CORS is convenient, incorrect settings can create security vulnerabilities.

### Mistake: Allowing All Origins

```http
Access-Control-Allow-Origin: *
```

This means, "Anyone from anywhere can access this server."

```javascript
// JavaScript from https://evil.com
fetch('https://api.example.com/user/profile')
  .then(r => r.json())
  .then(data => {
    // Process to steal user profile information
    console.log(data);
  });
```

This is particularly dangerous for requests that include authentication credentials (such as cookies), as a user logged into `api.example.com` could have their personal information stolen when accessing `evil.com`.

### Half Dangerous: `*` Prohibited for Requests Including Cookies

```javascript
fetch('https://api.example.com/user/profile', {
  credentials: 'include'  // Include cookies
})
```

When including authentication credentials, `Access-Control-Allow-Origin: *` cannot be used. You must always **specify a specific origin**.

```http
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
```

### Mistake: Allowing User-Specified URLs Directly

```javascript
// Dangerous implementation example (server-side)
const origin = request.headers.get('Origin');
response.headers.set('Access-Control-Allow-Origin', origin);  // Return as is!
```

This can allow requests from `https://evil.com`, resulting in a response with `Access-Control-Allow-Origin: https://evil.com`, which can be exploited.

**The correct approach is to prepare a whitelist and allow only those origins.**

```javascript
const allowedOrigins = [
  'https://www.example.com',
  'https://admin.example.com'
];

if (allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin);
}
```

### Mistake: Allowing All Headers

```http
Access-Control-Allow-Headers: *
```

This means "Any header is accepted," allowing injections of malicious data through custom headers.

**List only the necessary headers.**

```http
Access-Control-Allow-Headers: Content-Type, Authorization
```

## CORS Preflight Request: Browser's Prior Check

For requests other than simple requests (GET, HEAD, POST), the browser automatically sends an **OPTIONS method** request to check "Is this okay?" This is known as a preflight request.

```
1. JavaScript tries to send a PUT request

2. The browser automatically sends an OPTIONS preflight request
    OPTIONS /api/resource HTTP/1.1
    Origin: https://www.example.com
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: Content-Type

3. The server responds with "OK"
    HTTP 200 OK
    Access-Control-Allow-Origin: https://www.example.com
    Access-Control-Allow-Methods: PUT
    Access-Control-Allow-Headers: Content-Type

4. The browser sends the actual PUT request
```

If the server does not support the `OPTIONS` method, the preflight will fail, and the actual request will not be sent.

**Key Points:**

- Explicitly specify allowed origins in the whitelist
- Use `credentials: true` to handle requests including cookie authentication
- Allow only necessary methods and headers
- Options preflight request

## Common Questions

### Q. I encountered a CORS error. Can I allow all origins to resolve it?

**A:** No. It might work temporarily, but allowing `*` in a production environment poses a security risk. You need to revisit the server-side settings or redesign the API.

### Q. I want to access origins at different ports during local development. Is that okay?

**A:** Disabling CORS just for the local development environment is acceptable.

### Q. Does CORS matter when calling APIs from mobile apps?

**A:** CORS is a browser security feature, so it **does not apply to mobile apps**. Instead, you need to implement authentication and authorization using API keys or OAuth.

## Summary

| Point | Explanation |
|---------|------|
| **Purpose of CORS** | Allow cross-origin access while maintaining browser security |
| **Dangerous Configuration** | Using `Access-Control-Allow-Origin: *` for APIs requiring authentication |
| **Correct Configuration** | Explicitly specify allowed origins in the whitelist |
| **When Including Cookies** | Must specify `Access-Control-Allow-Credentials: true` and a specific origin |
| **Preflight** | Complex requests like PUT/DELETE require the browser to pre-check with OPTIONS |

CORS is not just a "cause of errors," but an important mechanism in web security. Misconfigurations can lead to security incidents, so it must be handled with care.

## References

- [MDN Web Docs - CORS (Cross-Origin Resource Sharing)](https://developer.mozilla.org/ja/docs/Web/HTTP/CORS)
- [Same-origin policy - MDN Web Docs](https://developer.mozilla.org/ja/docs/Web/Security/Same-origin_policy)
