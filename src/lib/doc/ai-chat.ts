import OpenAI from 'openai';

export const DEFAULT_MODEL = 'openai/gpt-5.4-mini';

// localStorage キー (DOC 専用。Chat ミニアプリ / admin とは別系統)
export const DOC_AI_KEY_STORAGE = 'doc-openrouter-api-key';
export const DOC_AI_MODEL_STORAGE = 'doc-openrouter-model';

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

export type ChatMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export function loadApiKey(): string {
  try {
    return localStorage.getItem(DOC_AI_KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function saveApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) localStorage.setItem(DOC_AI_KEY_STORAGE, trimmed);
    else localStorage.removeItem(DOC_AI_KEY_STORAGE);
  } catch {
    // localStorage が使用できない環境では保存をあきらめる
  }
}

export function loadModel(): string {
  try {
    const stored = localStorage.getItem(DOC_AI_MODEL_STORAGE);
    if (stored?.trim()) return stored.trim();
  } catch {
    // フォールバック
  }
  return DEFAULT_MODEL;
}

export function saveModel(model: string): void {
  try {
    localStorage.setItem(DOC_AI_MODEL_STORAGE, model);
  } catch {
    // localStorage が使用できない環境では保存をあきらめる
  }
}

export function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid base URL');
  }
  return url.href.replace(/\/+$/, '');
}

export function loadBaseUrl(): string {
  try { return localStorage.getItem('doc-ai-base-url') ?? DEFAULT_BASE_URL; }
  catch { return DEFAULT_BASE_URL; }
}

export function saveBaseUrl(value: string): void {
  try { localStorage.setItem('doc-ai-base-url', normalizeBaseUrl(value)); }
  catch { /* Storage may be unavailable. */ }
}

function createClient(apiKey: string, baseURL: string): OpenAI {
  return new OpenAI({
    baseURL,
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: new URL(baseURL).hostname === 'openrouter.ai' ? {
      'HTTP-Referer': 'https://www.hikari-dev.com',
      'X-Title': 'Hikari DOC',
    } : undefined,
  });
}

const SYSTEM_PROMPT = `あなたは Markdown 文書の編集を助けるアシスタントである。
ユーザーは Markdown エディタで文書を執筆しており、その文書全体 (と、あれば選択範囲) が文脈として与えられる。
文章の校正・要約・言い換え・翻訳・続きの執筆などを求められたら、Markdown 形式で結果を返すこと。
選択範囲について依頼された場合は選択範囲の置き換え文だけを、文書全体について依頼された場合は文書全体を返す。
コードフェンスで全体を囲む必要はなく、そのまま貼り付けられる Markdown を返すこと。
補足説明が必要な場合は結果の後に短く添える。`;

// cache_control 付きの system テキストメッセージを作る。
// OpenRouter は content パートの cache_control でプロンプトキャッシュのブレークポイントを指定する
// (Anthropic 等は明示指定が必須、OpenAI は自動キャッシュのため無視されるが害はない)。
// OpenAI SDK の型に cache_control が無いためキャストする。
function cachedSystem(text: string): ChatMessageParam {
  return {
    role: 'system',
    content: [{type: 'text', text, cache_control: {type: 'ephemeral'}}],
  } as unknown as ChatMessageParam;
}

// 現在の文書全体と選択範囲を文脈として先頭の system メッセージ群に埋め込む。
// キャッシュを効かせるため、変化しにくいものを先頭に固定プレフィックスとして並べる:
//   1. SYSTEM_PROMPT (常に不変) — cache_control
//   2. 文書全体 (編集しなければ不変) — cache_control
//   3. 選択範囲 (毎回変わりうる) — キャッシュ対象外。文書のブレークポイントより後ろに置き、
//      選択が変わっても文書までのキャッシュが無効にならないようにする。
export function buildContextMessages(source: string, selection: string, cache = true): ChatMessageParam[] {
  const messages: ChatMessageParam[] = [
    cache ? cachedSystem(SYSTEM_PROMPT) : {role: 'system', content: SYSTEM_PROMPT},
    cache ? cachedSystem(`--- 現在の文書全体 ---\n${source || '(空)'}`) : {role: 'system', content: source},
  ];
  if (selection.trim()) {
    messages.push({role: 'system', content: `--- 現在の選択範囲 ---\n${selection}`});
  }
  return messages;
}

export interface StreamChatArgs {
  apiKey: string;
  model: string;
  baseURL: string;
  messages: ChatMessageParam[];
  onDelta: (accumulated: string) => void;
  signal?: AbortSignal;
}

export interface ChatUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
}

export interface StreamChatResult {
  text: string;
  usage: ChatUsage | null;
}

// ストリーミングでチャット補完を実行し、逐次テキストを onDelta に渡す。最終テキストとトークン使用量を返す。
export async function streamChat({
  apiKey,
  model,
  baseURL,
  messages,
  onDelta,
  signal,
}: StreamChatArgs): Promise<StreamChatResult> {
  const client = createClient(apiKey, normalizeBaseUrl(baseURL));
  const stream = await client.chat.completions.create(
    {model, messages, stream: true, stream_options: {include_usage: true}},
    {signal},
  );
  let accumulated = '';
  let usage: ChatUsage | null = null;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      accumulated += delta.content;
      onDelta(accumulated);
    }
    // 使用量は最後のチャンクにのみ含まれる (choices は空配列になる)
    if (chunk.usage) {
      usage = {
        promptTokens: chunk.usage.prompt_tokens,
        completionTokens: chunk.usage.completion_tokens,
        totalTokens: chunk.usage.total_tokens,
        // キャッシュヒットしたプロンプトトークン数 (OpenRouter が返す場合)
        cachedTokens: chunk.usage.prompt_tokens_details?.cached_tokens,
      };
    }
  }
  return {text: accumulated, usage};
}
