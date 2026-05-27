import OpenAI from "openai";

export type AiModel = "gpt-5-nano" | "gpt-5-mini" | "gpt-5";

export const AI_MODELS: AiModel[] = ["gpt-5-nano", "gpt-5-mini", "gpt-5"];

export const API_KEY_STORAGE = "hikari_admin_openai_key";

function getApiKey(): string {
  const stored = localStorage.getItem(API_KEY_STORAGE) ?? "";
  if (!stored) {
    throw new Error(
      "OpenAI API キーが設定されていません。ツールバーの「設定」から API キーを入力してください。",
    );
  }
  return stored;
}

function createClient(): OpenAI {
  return new OpenAI({ apiKey: getApiKey(), dangerouslyAllowBrowser: true });
}

export async function generateOutline(
  title: string,
  description: string,
  model: AiModel,
): Promise<string> {
  const client = createClient();
  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "あなたはブログ記事のライターです。指定されたタイトルと説明に基づいて、読みやすく構造化された Markdown 形式のブログ記事を日本語で書いてください。文体は「である調」で統一し、見出しは ## から始めてください。コードブロックには言語を指定してください。",
      },
      {
        role: "user",
        content: `タイトル: ${title}\n説明: ${description || "(説明なし)"}\n\nこのタイトルでブログ記事を Markdown 形式で書いてください。`,
      },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export interface TranslationResult {
  en: string;
  "zh-TW": string;
}

async function translateOne(
  client: OpenAI,
  content: string,
  target: "English" | "Traditional Chinese (Taiwan)",
  model: AiModel,
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a translator. Translate the following Markdown article into ${target}. Preserve all Markdown formatting, code blocks, and structure. Output only the translated content with no preamble or explanation.`,
      },
      { role: "user", content },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function generateFromPrompt(
  prompt: string,
  model: AiModel,
): Promise<string> {
  const client = createClient();
  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "あなたはブログ記事のライターです。指定された内容に基づいて、読みやすく構造化された Markdown 形式のブログ記事を日本語で書いてください。文体は「である調」で統一し、見出しは ## から始めてください。コードブロックには言語を指定してください。前置きや説明は不要です。記事本文のみ出力してください。",
      },
      { role: "user", content: prompt },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function editWithPrompt(
  content: string,
  instruction: string,
  model: AiModel,
): Promise<string> {
  const client = createClient();
  const res = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "あなたはブログ記事の編集者です。与えられた Markdown 記事を指示に従って編集してください。Markdown の形式と構造を保ちながら、指示された変更を加えてください。編集後の記事全体を出力してください。前置きや説明は不要です。",
      },
      {
        role: "user",
        content: `以下の記事を編集してください。\n\n---\n${content}\n---\n\n指示: ${instruction}`,
      },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function translateToOtherLangs(
  content: string,
  model: AiModel,
): Promise<TranslationResult> {
  const client = createClient();
  const [en, zhTW] = await Promise.all([
    translateOne(client, content, "English", model),
    translateOne(client, content, "Traditional Chinese (Taiwan)", model),
  ]);
  return { en, "zh-TW": zhTW };
}
