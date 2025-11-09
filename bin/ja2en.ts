const axios = require('axios');
const { Command } = require('commander');
const fs = require('fs')
const path = require('path');

const program = new Command();

program
  .name('file-processor')
  .description('入力ファイルを処理して出力ファイルに保存するツール')
  .version('1.0.0')
  .requiredOption('-i, --input <path>', '入力ファイルのパス')
  .option('-o, --output <path>', '出力ファイルのパス');

program.parse(process.argv);

const options = program.opts();
let output = options.output
if (!output) {
  const basename = path.basename(options.input);
  output = path.join('.', 'i18n', 'en', 'docusaurus-plugin-content-blog', basename);
}

console.log('入力ファイル:', options.input);
console.log('出力ファイル:', output);

const GEMMA_ENDPOINT = 'http://localhost:11434/api/generate';

const readTextFile = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

const writeTextFile = (filePath: string, content: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, 'utf8', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const queryGemma = async (japaneseText: string) => {
    const prompt = `
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
    try {
        const response = await axios.post(GEMMA_ENDPOINT, {
            model: 'gemma3n:latest',
            prompt: prompt,
            stream: false
        });
        return response.data.response;
    } catch (error) {
        console.error('Error querying Gemma3:', error);
    }
}

const main = async () => {
    const japaneseText = await readTextFile(options.input);
    const response = await queryGemma(japaneseText);
    const englishText = response
        ?.trim()
        .replace(/^\[EOL\]\n?/, '')
        .replace(/\n?\[EOL\]$/, '')
    await writeTextFile(output, englishText);
}

main();