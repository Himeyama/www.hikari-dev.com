---
title: Development of the translation CLI tool translate-mcp supporting multiple languages using OpenAI API
authors: hikari
tags: [MCP, translation, OpenAI, Python]
image: /img/ogp/2026-04-02-translate-mcp.webp
---

translate-mcp is a translation tool that utilizes OpenAI's API. It supports both CLI mode and MCP server usage. It is useful in a wide range of scenarios, from translating an entire file to being integrated into AI tools.

{/**/}

## What is translate-mcp

[translate-mcp](https://github.com/Himeyama/translate-mcp) is a **translation-specific tool using the OpenAI API**. It is implemented in Python and has two usage modes.

1. **CLI Mode**: Translate files directly from the command line.
2. **MCP Server Mode**: Operates as a Model Context Protocol (MCP) server, integrating with AI tools.

## Features

- **Multi-language support**: Supports various languages.
- **Simple usage**: Can be started with just one API key.
- **Two usage modes**: Operates both as a CLI script and as an MCP server.
- **Lightweight**: Relies solely on the OpenAI API without dependency on external libraries.
- **Error handling**: In CLI mode, errors are returned in stderr, while in MCP mode, errors are returned in JSON format.

## Setup

### Prerequisites

- Python must be installed.
- An OpenAI API key must be obtained.

### Installing uv

Since translate-mcp is managed by `uv`, you first need to install `uv`.

For installation instructions, refer to [Installation | uv](https://docs.astral.sh/uv/getting-started/installation/).

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Installing translate-mcp

You can install it using the following command with `uv`.

```bash
uv tool install git+https://github.com/Himeyama/translate-mcp
```

Alternatively, you can run it directly without installation using `uvx`.

```bash
uvx git+https://github.com/Himeyama/translate-mcp --help
```

## How to Use

### CLI Mode

To translate a file, run the following command:

```bash
translate --input blog/2026-04-02-example.md --from Japanese --to English
```

The result will be output to standard output. You can save it to a file using redirection.

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to English \
  --output i18n/en/blog/2026-04-02-example.md
```

#### Parameters

- `--mcp`: MCP mode
- `--input`: Path to the file to be translated
- `--from`: Source language (e.g., Japanese, English)
- `--to`: Target language (e.g., English, Taiwanese)
- `--output` (optional): Destination to save the translated text
- `--model` (optional): OpenAI model (e.g., gpt-5-mini)
- `--debug` (optional): Debug mode

#### In case of errors

If an error occurs, it will be output to stderr.

### MCP Server Mode

Start it as an MCP server, making it accessible from Claude Code and other AI tools.

```bash
translate --mcp
```

## Practical Examples

This section describes how to translate a blog article from Japanese to English and Traditional Chinese (Taiwan).

### Japanese Version (Original Article)

```bash
# Japanese article exists in blog/2026-04-02-example.md
```

### Generate English Version

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to English > i18n/en/docusaurus-plugin-content-blog/2026-04-02-example.md
```

### Generate Taiwan Version (Traditional Chinese)

```bash
translate \
  --input blog/2026-04-02-example.md \
  --from Japanese \
  --to Taiwanese > i18n/zh-TW/docusaurus-plugin-content-blog/2026-04-02-example.md
```

## Advantages and Disadvantages

### Advantages

- **High accuracy**: Uses OpenAI's high-quality models (such as GPT-4).
- **Skill support**: Can be integrated with various tools like ChatGPT and Claude.
- **Simplicity**: Very easy to set up and use.
- **Customizable**: The source code is open, allowing for customization.

### Disadvantages

- **API costs**: Costs incurred from OpenAI API usage based on translation volume.
- **Internet connection required**: Cannot be used offline as API calls are necessary.
- **Rate limiting**: Subject to OpenAI API's rate limits.

## Conclusion

translate-mcp is a **simple and high-quality translation tool** that leverages the OpenAI API. It is effective in various scenarios, including multi-language support for blog articles, document translation, and integration into AI tools.

In particular, it is effective to use as an automation script for supporting multiple languages in static site generators like Docusaurus.

## References

- [GitHub - Himeyama/translate-mcp](https://github.com/Himeyama/translate-mcp)
- [OpenAI API Documentation](https://platform.openai.com/docs)
