import OpenAI from "openai";

export type OpenAiModel = "gpt-5.4-nano" | "gpt-5.4-mini" | "gpt-5.4";
export type ClaudeModel = "claude-haiku-4-5-20251001" | "claude-sonnet-4-6" | "claude-opus-4-7";
export type AiModel = OpenAiModel | ClaudeModel;

export const OPENAI_MODELS: OpenAiModel[] = ["gpt-5.4-nano", "gpt-5.4-mini", "gpt-5.4"];
export const CLAUDE_MODELS: ClaudeModel[] = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-7",
];
/** @deprecated Use OPENAI_MODELS or CLAUDE_MODELS */
export const AI_MODELS: AiModel[] = [...OPENAI_MODELS, ...CLAUDE_MODELS];

export const CLAUDE_MODEL_LABELS: Record<ClaudeModel, string> = {
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "claude-sonnet-4-6": "Claude Sonnet 4.6",
  "claude-opus-4-7": "Claude Opus 4.7",
};

export const API_KEY_STORAGE = "hikari_admin_openai_key";
export const ANTHROPIC_API_KEY_STORAGE = "hikari_admin_anthropic_key";

export function isClaudeModel(model: AiModel): model is ClaudeModel {
  return CLAUDE_MODELS.includes(model as ClaudeModel);
}

function getOpenAiKey(): string {
  const stored = localStorage.getItem(API_KEY_STORAGE) ?? "";
  if (!stored) {
    throw new Error(
      "OpenAI API キーが設定されていません。ツールバーの「設定」から API キーを入力してください。",
    );
  }
  return stored;
}

function getAnthropicKey(): string {
  const stored = localStorage.getItem(ANTHROPIC_API_KEY_STORAGE) ?? "";
  if (!stored) {
    throw new Error(
      "Anthropic API キーが設定されていません。ツールバーの「設定」から API キーを入力してください。",
    );
  }
  return stored;
}

function getClient(model: AiModel): OpenAI {
  if (isClaudeModel(model)) {
    return new OpenAI({
      apiKey: getAnthropicKey(),
      baseURL: "https://api.anthropic.com/v1",
      defaultHeaders: {
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      dangerouslyAllowBrowser: true,
    });
  }
  return new OpenAI({ apiKey: getOpenAiKey(), dangerouslyAllowBrowser: true });
}

export interface TranslationResult {
  en?: string;
  "zh-TW"?: string;
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
  const client = getClient(model);
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
  const client = getClient(model);
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

export async function translateToEn(content: string, model: AiModel): Promise<string> {
  const client = getClient(model);
  return translateOne(client, content, "English", model);
}

export async function translateToZhTW(content: string, model: AiModel): Promise<string> {
  const client = getClient(model);
  return translateOne(client, content, "Traditional Chinese (Taiwan)", model);
}

export async function translateToOtherLangs(
  content: string,
  model: AiModel,
): Promise<TranslationResult> {
  const client = getClient(model);
  const [en, zhTW] = await Promise.all([
    translateOne(client, content, "English", model),
    translateOne(client, content, "Traditional Chinese (Taiwan)", model),
  ]);
  return { en, "zh-TW": zhTW };
}
