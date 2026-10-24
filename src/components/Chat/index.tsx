import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import Translate, { translate } from '@docusaurus/Translate';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import styles from './styles.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'gpt-4o-mini';
const LS_API_KEY = 'hikari-chat-api-key';
const LS_MODEL = 'hikari-chat-model';
const LS_ENDPOINT = 'hikari-chat-endpoint';
const DEFAULT_ENDPOINT = 'https://api.openai.com/v1';

function normalizeEndpoint(value: string): string {
  const url = new URL(value.trim() || DEFAULT_ENDPOINT);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid endpoint');
  }
  return url.href.replace(/\/+$/, '');
}
const SYSTEM_PROMPT = `You are Hikari, a friendly and knowledgeable AI assistant on hikari-dev.com — a personal tech blog about programming, web development, and software engineering.

You help users with:
- Coding questions and code reviews
- Technical explanations and architecture discussions
- Creative brainstorming and problem-solving
- General knowledge on any topic

Guidelines:
- Be concise, accurate, and genuinely helpful
- Use fenced code blocks with language tags (e.g. \`\`\`typescript) for code examples
- Use Mermaid diagrams (\`\`\`mermaid) when helpful for explaining flows or architectures
- Respond in the same language the user writes in (Japanese, English, Traditional Chinese, etc.)
- When uncertain, say so honestly rather than guessing`;

// ─── Mermaid Block ────────────────────────────────────────────────────────────

function MermaidBlock({ code, isDark }: { code: string; isDark: boolean }) {
  const [svg, setSvg] = useState<string>('');
  const [renderError, setRenderError] = useState<string>('');
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
        const { svg: rendered } = await mermaid.render(idRef.current, code.trim());
        idRef.current = `mermaid-${Math.random().toString(36).slice(2)}`;
        if (!cancelled) {
          setSvg(rendered);
          setRenderError('');
        }
      } catch (e) {
        if (!cancelled) setRenderError(String(e));
      }
    };

    render();
    return () => { cancelled = true; };
  }, [code, isDark]);

  if (renderError) {
    return <pre className={styles.codeBlockPlain}><code>{code}</code></pre>;
  }
  if (!svg) {
    return <div className={styles.mermaidPlaceholder} />;
  }
  return (
    <div
      className={styles.mermaidBlock}
      // mermaid が生成する安全な SVG をレンダリング
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─── Syntax Code Block ────────────────────────────────────────────────────────

function CodeBlock({ code, language, isDark }: { code: string; language: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);
  const theme = {...themes.vsLight, plain: {...themes.vsLight.plain, backgroundColor: '#c0c0c0', color: '#222'}};

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlockWrapper}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeLanguage}>{language}</span>
        <button type="button" className={styles.copyButton} onClick={handleCopy}>
          {copied
            ? <Translate id="chat.code.copied">コピー済み</Translate>
            : <Translate id="chat.code.copy">コピー</Translate>
          }
        </button>
      </div>
      <Highlight theme={theme} code={code.trim()} language={language as Parameters<typeof Highlight>[0]['language']}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} ${styles.codeBlock}`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                <span className={styles.lineNumber}>{i + 1}</span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function MarkdownContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const isDark = false;

  return (
    <div className={styles.assistantContent}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match?.[1] ?? '';
            const codeStr = String(children).replace(/\n$/, '');
            const isBlock = codeStr.includes('\n') || !!language;

            if (isBlock && language === 'mermaid' && !isStreaming) {
              return <MermaidBlock code={codeStr} isDark={isDark} />;
            }
            if (isBlock && language) {
              return <CodeBlock code={codeStr} language={language} isDark={isDark} />;
            }
            if (isBlock) {
              return <pre className={styles.codeBlockPlain}><code>{codeStr}</code></pre>;
            }
            return <code className={styles.inlineCode}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <p className={styles.typingIndicator} role="status">
      <Translate id="chat.thinking">応答を生成中...</Translate>
    </p>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}>
      <div className={`${styles.messageBubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
        {isUser ? (
          <p className={styles.userText}>{message.content}</p>
        ) : (
          <>
            {message.content ? (
              <>
                <MarkdownContent content={message.content} isStreaming={isStreaming} />
                {isStreaming && <span className={styles.cursor} aria-hidden="true">▍</span>}
              </>
            ) : (
              <TypingIndicator />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HikariChat(): ReactNode {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [endpointInput, setEndpointInput] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>([]);

  useEffect(() => {
    const savedKey = localStorage.getItem(LS_API_KEY) ?? '';
    const savedModel = localStorage.getItem(LS_MODEL) ?? DEFAULT_MODEL;
    setApiKey(savedKey);
    setApiKeyInput(savedKey);
    setSelectedModel(savedModel);
    const savedEndpoint = localStorage.getItem(LS_ENDPOINT) ?? '';
    setEndpointInput(savedEndpoint);
    try {
      setEndpoint(normalizeEndpoint(savedEndpoint));
    } catch {
      setEndpoint('');
      setSettingsOpen(true);
      setSettingsError(translate({id: 'chat.endpoint.invalid', message: '有効な HTTP または HTTPS のベース URL を入力してください。'}));
    }
    if (!savedKey) setSettingsOpen(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSaveApiKey = () => {
    let nextEndpoint: string;
    try {
      nextEndpoint = normalizeEndpoint(endpointInput);
    } catch {
      setSettingsError(translate({id: 'chat.endpoint.invalid', message: '有効な HTTP または HTTPS のベース URL を入力してください。'}));
      return;
    }
    const nextKey = apiKeyInput.trim();
    localStorage.setItem(LS_API_KEY, nextKey);
    localStorage.setItem(LS_ENDPOINT, endpointInput.trim() ? nextEndpoint : '');
    setApiKey(nextKey);
    setEndpoint(nextEndpoint);
    setEndpointInput(endpointInput.trim() ? nextEndpoint : '');
    setSettingsError('');
    setShowApiKeyValue(false);
    setError(null);
    if (nextKey) setSettingsOpen(false);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    localStorage.setItem(LS_MODEL, model);
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
    setStreamingId(null);
    setInput('');
    historyRef.current = [];
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    const model = selectedModel.trim();
    if (!model) {
      setError(translate({id: 'chat.error.noModel', message: 'モデル名を入力してください。'}));
      return;
    }

    if (!apiKey) {
      setError(translate({ id: 'chat.error.noApiKey', message: 'API キーを設定してください。' }));
      setSettingsOpen(true);
      return;
    }

    if (!endpoint) {
      setSettingsOpen(true);
      return;
    }

    const assistantId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: trimmed },
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setError(null);
    setIsLoading(true);
    setStreamingId(assistantId);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const historySnapshot = historyRef.current;
    historyRef.current = [...historyRef.current, { role: 'user', content: trimmed }];

    try {
      const openai = new OpenAI({ apiKey, baseURL: endpoint, dangerouslyAllowBrowser: true });

      const stream = await openai.chat.completions.create({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...historyRef.current],
        stream: true,
      });

      let accumulated = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          accumulated += delta.content;
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
          );
        }
      }

      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: accumulated },
      ];
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      historyRef.current = historySnapshot;
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }, [input, isLoading, apiKey, selectedModel, endpoint]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}${'•'.repeat(Math.max(0, apiKey.length - 11))}${apiKey.slice(-4)}`
    : '';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Translate id="chat.title">ひかりチャット</Translate>
        </h1>
        <div className={styles.toolbar}>
          <label className={styles.modelField} htmlFor="chat-model">
            <Translate id="chat.model.label">モデル名</Translate>
            <input
              id="chat-model"
              type="text"
              className={styles.modelInput}
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              placeholder={translate({id: 'chat.model.placeholder', message: 'モデル ID を入力'})}
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
            />
          </label>
          <button
            type="button"
            className={styles.controlButton}
            onClick={() => setSettingsOpen((v) => !v)}
            aria-expanded={settingsOpen}
            aria-controls="chat-api-settings"
          >
            <Translate id="chat.settings">API キー設定</Translate>
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleReset}
            disabled={isLoading || (messages.length === 0 && !input && !error)}
          >
            <Translate id="chat.reset">リセット</Translate>
          </button>
        </div>
      </header>

      {settingsOpen && (
        <fieldset id="chat-api-settings" className={styles.settingsPanel}>
          <legend><Translate id="chat.settings">API キー設定</Translate></legend>
          <label className={styles.settingsLabel} htmlFor="chat-api-key">
            <Translate id="chat.apiKey.label">API キー</Translate>
          </label>
          <div className={styles.apiKeyRow}>
            <input
              id="chat-api-key"
              type={showApiKeyValue ? 'text' : 'password'}
              className={styles.apiKeyInput}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
              placeholder={translate({id: 'chat.apiKey.placeholder', message: 'sk-...'})}
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
            />
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setShowApiKeyValue((v) => !v)}
              aria-pressed={showApiKeyValue}
              aria-controls="chat-api-key"
            >
              <Translate id="chat.apiKey.show">キー表示</Translate>
            </button>
            <button type="button" className={styles.controlButton} onClick={handleSaveApiKey} disabled={isLoading}>
              <Translate id="chat.apiKey.save">保存</Translate>
            </button>
          </div>
          <label className={styles.endpointLabel} htmlFor="chat-endpoint">
            <Translate id="chat.endpoint.label">カスタム エンドポイント</Translate>
          </label>
          <input
            id="chat-endpoint"
            type="url"
            className={styles.endpointInput}
            value={endpointInput}
            onChange={(e) => setEndpointInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
            placeholder={DEFAULT_ENDPOINT}
            aria-describedby="chat-endpoint-note"
            autoComplete="off"
            spellCheck={false}
            disabled={isLoading}
          />
          <p id="chat-endpoint-note" className={styles.apiKeyNote}>
            <Translate id="chat.endpoint.note">OpenAI 互換 API のベース URL (例: https://example.com/v1)。空欄の場合は OpenAI を使用する。API キーとメッセージは、保存した接続先に送信される。</Translate>
          </p>
          {settingsError && <p className={styles.errorText} role="alert">{settingsError}</p>}
          <p className={styles.apiKeyNote}>
            <Translate id="chat.apiKey.note">API キーは、このブラウザーの localStorage に保存される。</Translate>
          </p>
          {maskedKey && (
            <p className={styles.apiKeyHint}>
              <Translate id="chat.apiKey.current">現在のキー:</Translate>{' '}
              <span className={styles.maskedKey}>{maskedKey}</span>
            </p>
          )}
        </fieldset>
      )}

      <div className={styles.messages} aria-live="polite" aria-busy={isLoading}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <p className={styles.welcomeText}>
              <Translate id="chat.welcome">質問や相談を入力してください。</Translate>
            </p>
            {!apiKey && (
              <p className={styles.welcomeHint}>
                <Translate id="chat.welcome.noKey">API キー設定から API キーを設定してください。</Translate>
              </p>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isStreaming={msg.id === streamingId} />
        ))}
        {error && (
          <div className={styles.errorBanner} role="alert">
            <span className={styles.errorText}>{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            aria-label={translate({id: 'chat.input.label', message: 'メッセージ'})}
            placeholder={translate({id: 'chat.input.placeholder', message: 'メッセージを入力...'})}
            rows={2}
            disabled={isLoading}
          />
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleSend}
            disabled={!input.trim() || !selectedModel.trim() || isLoading}
          >
            <Translate id="chat.send">送信</Translate>
          </button>
        </div>
        <p className={styles.inputNote}>
          <Translate id="chat.input.note">Enter で送信、Shift + Enter で改行。会話はページを閉じるとリセットされる。</Translate>
        </p>
      </div>
    </div>
  );
}
