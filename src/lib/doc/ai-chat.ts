import OpenAI from 'openai';

// OpenRouter のモデル ID (slug)。slug は openrouter.ai の models 一覧で実在を確認済み。
// 注意:
//  - Anthropic の命名は tier-version 順 (claude-haiku-4.5 / claude-sonnet-5)。
//  - 要望にあった "claude-5-opus" は OpenRouter に存在しないため、最新の Opus
//    (claude-opus-4.8) を採用している。
export interface ChatModel {
  id: string; // OpenRouter slug (provider/model)
  label: string; // 表示名
  provider: string; // プロバイダ表示名
}

export const MODELS: ChatModel[] = [
  {id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', provider: 'OpenAI'},
  {id: 'openai/gpt-5.4-nano', label: 'GPT-5.4 Nano', provider: 'OpenAI'},
  {id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI'},
  {id: 'openai/gpt-5.6-sol', label: 'GPT-5.6 Sol', provider: 'OpenAI'},
  {id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', provider: 'Anthropic'},
  {id: 'anthropic/claude-sonnet-5', label: 'Claude Sonnet 5', provider: 'Anthropic'},
  {id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8', provider: 'Anthropic'},
  {id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'DeepSeek'},
  {id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro', provider: 'DeepSeek'},
  {id: 'z-ai/glm-5.2', label: 'GLM 5.2', provider: 'Z.AI'},
  {id: 'moonshotai/kimi-k3', label: 'Kimi K3', provider: 'Moonshot AI'},
];

export const DEFAULT_MODEL = 'openai/gpt-5.4-mini';

export function getModel(id: string): ChatModel {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

// localStorage キー (DOC 専用。Chat ミニアプリ / admin とは別系統)
export const DOC_AI_KEY_STORAGE = 'doc-openrouter-api-key';
export const DOC_AI_MODEL_STORAGE = 'doc-openrouter-model';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

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
    if (stored && MODELS.some((m) => m.id === stored)) return stored;
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

function createClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'HTTP-Referer': 'https://www.hikari-dev.com',
      'X-Title': 'Hikari DOC',
    },
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
export function buildContextMessages(source: string, selection: string): ChatMessageParam[] {
  const messages: ChatMessageParam[] = [
    cachedSystem(SYSTEM_PROMPT),
    cachedSystem(`--- 現在の文書全体 ---\n${source || '(空)'}`),
  ];
  if (selection.trim()) {
    messages.push({role: 'system', content: `--- 現在の選択範囲 ---\n${selection}`});
  }
  return messages;
}

export interface StreamChatArgs {
  apiKey: string;
  model: string;
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
  messages,
  onDelta,
  signal,
}: StreamChatArgs): Promise<StreamChatResult> {
  const client = createClient(apiKey);
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
