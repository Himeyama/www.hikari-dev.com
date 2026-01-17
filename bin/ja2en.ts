const { Command } = require('commander');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const program = new Command();

program
  .name('file-processor')
  .description('入力ファイルを処理して出力ファイルに保存するツール（OpenAI gpt-5-mini を使用）')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', '入力ファイルのパス')
  .option('-o, --output <path>', '出力ファイルのパス')
  .option('-m, --model <name>', 'OpenAI モデル名', 'gpt-5-mini')
  .option('--timeout <ms>', 'リクエストタイムアウト（ミリ秒）', '120000');

program.parse(process.argv);

const options = program.opts();

let output = options.output;
if (!output) {
  const basename = path.basename(options.input);
  output = path.join('.', 'i18n', 'en', 'docusaurus-plugin-content-blog', basename);
}

console.log('入力ファイル:', options.input);
console.log('出力ファイル:', output);
console.log('OpenAI model:', options.model);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('ERROR: 環境変数 OPENAI_API_KEY を設定してください。');
  process.exit(1);
}

// Node 18+ の global fetch を想定
if (typeof fetch === 'undefined') {
  console.error('ERROR: global fetch が利用できません。Node 18+ を使用してください。');
  process.exit(1);
}

const readTextFile = async (filePath) => {
  return fsp.readFile(filePath, 'utf8');
};

const writeTextFile = async (filePath, content) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, content, 'utf8');
};

const buildPrompt = (japaneseText) => {
  return `
# 要件
以下の日本語テキスト ([EOL] から [EOL] まで）を、意味と文脈を正確に反映した自然な英語に翻訳してください。
メタデータはタイトルのみ翻訳し、その他はそのまま出力してください。  
コードブロックはコメントのみ翻訳してください。
出力には先頭と末尾に [EOL] を含みます。
出力は翻訳文のみとし、説明や補足は一切不要です。

# 日本語
[EOL]
${japaneseText}
[EOL]

# 英語
[EOL]
{英語の文章を出力}
[EOL]

# 例
入力:
[EOL]
---
title: あいさつ
authors: hikari
---
こんにちは
[EOL]

出力:
[EOL]
---
title: Greeting
authors: hikari
---
Hello
[EOL]
`;
};

const extractTextFromOpenAIResponse = (data) => {
  if (!data) return '';

  // Responses API の output 配列をチェック
  if (Array.isArray(data.output) && data.output.length > 0) {
    let combined = '';
    for (const out of data.output) {
      if (out && Array.isArray(out.content)) {
        for (const c of out.content) {
          if (c && c.type === 'output_text' && typeof c.text === 'string') combined += c.text;
          else if (c && typeof c.text === 'string') combined += c.text;
          else if (typeof c === 'string') combined += c;
        }
      } else if (typeof out === 'string') {
        combined += out;
      } else if (out && typeof out.text === 'string') {
        combined += out.text;
      }
    }
    if (combined) return combined;
  }

  // 互換性のため old choices/message 形式もチェック
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const ch = data.choices[0];
    if (ch && ch.message) {
      if (typeof ch.message === 'string') return ch.message;
      if (typeof ch.message.content === 'string') return ch.message.content;
      if (Array.isArray(ch.message.content)) return ch.message.content.map(c => c?.text ?? '').join('');
    }
    if (typeof ch.text === 'string') return ch.text;
  }

  if (typeof data.text === 'string') return data.text;

  return '';
};

const queryOpenAI = async (japaneseText) => {
  const prompt = buildPrompt(japaneseText);
  const controller = new AbortController();
  const timeoutMs = parseInt(options.timeout, 10) || 120000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model,
        input: prompt
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      let bodyText = '';
      try { bodyText = await res.text(); } catch (e) { }
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText} ${bodyText}`);
    }

    const data = await res.json();
    return extractTextFromOpenAIResponse(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`Request timed out after ${timeoutMs} ms`);
    } else {
      console.error('Error querying OpenAI:', err.message ?? err);
    }
    throw err;
  }
};

const main = async () => {
  try {
    const japaneseText = await readTextFile(options.input);
    const responseText = await queryOpenAI(japaneseText);
    const englishText = (responseText || '')
      .trim()
      .replace(/^\[EOL\]\n?/, '')
      .replace(/\n?\[EOL\]$/, '');

    await writeTextFile(output, englishText);
    console.log('翻訳ファイルを書き出しました:', output);
  } catch (err) {
    console.error('処理中にエラーが発生しました:', err);
    process.exit(1);
  }
};

main();