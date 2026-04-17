import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import * as Select from '@radix-ui/react-select';
import * as Tooltip from '@radix-ui/react-tooltip';
import Translate, { translate } from '@docusaurus/Translate';
import OpenAI from 'openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import styles from './styles.module.css';

function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.getAttribute('data-theme') === 'dark');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MODELS: { id: string; label: string }[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
];

const DEFAULT_MODEL = 'gpt-4o-mini';
const LS_API_KEY = 'hikari-chat-api-key';
const LS_MODEL = 'hikari-chat-model';

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

// ─── Icons ───────────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M15.5 9L2 2.5 5.5 9 2 15.5 15.5 9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M12.5 7.5a5 5 0 1 1-1.5-3.5L13 2v4h-4l1.5-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <ellipse cx="7.5" cy="7.5" rx="6.5" ry="4.5" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path d="M2 2l11 11M6 6.2A2 2 0 0 0 8.8 9M3.5 4A6.5 6.5 0 0 0 1 7.5s2.3 4.5 6.5 4.5A6 6 0 0 0 11 11M6.5 3a6 6 0 0 1 1 0c4 0 6.5 4.5 6.5 4.5a8 8 0 0 1-1.3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3 3l1 1M11 11l1 1M11 3l-1 1M3 11l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

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
  const theme = isDark ? themes.dracula : themes.github;

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
  const isDark = useDarkMode();

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
    <div className={styles.typingIndicator} aria-label="thinking">
      <span /><span /><span />
    </div>
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
        ) : message.content ? (
          <>
            <MarkdownContent content={message.content} isStreaming={isStreaming} />
            {isStreaming && <span className={styles.cursor} aria-hidden="true">▍</span>}
          </>
        ) : (
          <TypingIndicator />
        )}
      </div>
    </div>
  );
}

// ─── Model Selector ───────────────────────────────────────────────────────────

function ModelSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger
        className={styles.selectTrigger}
        aria-label={translate({ id: 'chat.model.label', message: 'モデル' })}
      >
        <Select.Value />
        <Select.Icon className={styles.selectIcon}>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={styles.selectContent} position="popper" sideOffset={6}>
          <Select.Viewport className={styles.selectViewport}>
            {MODELS.map((model) => (
              <Select.Item key={model.id} value={model.id} className={styles.selectItem}>
                <Select.ItemText>{model.label}</Select.ItemText>
                <Select.ItemIndicator className={styles.selectItemIndicator}>
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HikariChat(): ReactNode {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyValue, setShowApiKeyValue] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem(LS_API_KEY) ?? '';
    const savedModel = localStorage.getItem(LS_MODEL) ?? DEFAULT_MODEL;
    setApiKey(savedKey);
    setApiKeyInput(savedKey);
    setSelectedModel(savedModel);
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
    localStorage.setItem(LS_API_KEY, apiKeyInput);
    setApiKey(apiKeyInput);
    if (apiKeyInput) setSettingsOpen(false);
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
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!apiKey) {
      setError(translate({ id: 'chat.error.noApiKey', message: 'OpenAI API キーを設定してください。' }));
      setSettingsOpen(true);
      return;
    }

    const assistantId = `a-${Date.now()}`;
    const messagesForApi = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: trimmed },
    ];

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

    try {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const stream = await openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messagesForApi],
        stream: true,
      });

      let accumulated = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        accumulated += delta;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }, [input, isLoading, apiKey, messages, selectedModel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}${'•'.repeat(Math.max(0, apiKey.length - 11))}${apiKey.slice(-4)}`
    : '';

  return (
    <Tooltip.Provider delayDuration={400}>
      <div className={styles.container}>

        {/* ── ヘッダー ── */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.titleIcon} aria-hidden="true">✦</span>
            <h1 className={styles.title}>
              <Translate id="chat.title">ひかりチャット</Translate>
            </h1>
          </div>
          <div className={styles.headerRight}>
            <ModelSelector value={selectedModel} onChange={handleModelChange} />

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className={`${styles.iconButton} ${settingsOpen ? styles.iconButtonActive : ''}`}
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-label={translate({ id: 'chat.settings', message: '設定' })}
                >
                  <SettingsIcon />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className={styles.tooltip} sideOffset={6}>
                  <Translate id="chat.settings">設定</Translate>
                  <Tooltip.Arrow className={styles.tooltipArrow} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={handleReset}
                  disabled={messages.length === 0}
                  aria-label={translate({ id: 'chat.reset', message: 'リセット' })}
                >
                  <RefreshIcon />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className={styles.tooltip} sideOffset={6}>
                  <Translate id="chat.reset">リセット</Translate>
                  <Tooltip.Arrow className={styles.tooltipArrow} />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </header>

        {/* ── 設定パネル ── */}
        {settingsOpen && (
          <div className={styles.settingsPanel}>
            <label className={styles.settingsLabel} htmlFor="chat-api-key">
              <Translate id="chat.apiKey.label">OpenAI API キー</Translate>
            </label>
            <div className={styles.apiKeyRow}>
              <div className={styles.apiKeyInputWrapper}>
                <input
                  id="chat-api-key"
                  type={showApiKeyValue ? 'text' : 'password'}
                  className={styles.apiKeyInput}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                  placeholder={translate({ id: 'chat.apiKey.placeholder', message: 'sk-...' })}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className={styles.apiKeyToggle}
                  onClick={() => setShowApiKeyValue((v) => !v)}
                  aria-label={showApiKeyValue
                    ? translate({ id: 'chat.apiKey.hide', message: '隠す' })
                    : translate({ id: 'chat.apiKey.show', message: '表示' })
                  }
                >
                  {showApiKeyValue ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <button type="button" className={styles.saveButton} onClick={handleSaveApiKey}>
                <Translate id="chat.apiKey.save">保存</Translate>
              </button>
            </div>
            <p className={styles.apiKeyNote}>
              <Translate id="chat.apiKey.note">
                API キーはブラウザの localStorage にのみ保存されます。
              </Translate>
            </p>
          </div>
        )}

        {/* ── メッセージ一覧 ── */}
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <p className={styles.welcomeEmoji} aria-hidden="true">✦</p>
              <p className={styles.welcomeText}>
                <Translate id="chat.welcome">こんにちは！何でも聞いてください。</Translate>
              </p>
              {!apiKey && (
                <p className={styles.welcomeHint}>
                  <Translate id="chat.welcome.noKey">
                    まず右上の設定から API キーを設定してください。
                  </Translate>
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={msg.id === streamingId}
            />
          ))}

          {error && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorText}>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 入力エリア ── */}
        <div className={styles.inputArea}>
          <div className={styles.inputRow}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={translate({
                id: 'chat.input.placeholder',
                message: 'メッセージを送信... (Shift+Enter で改行)',
              })}
              rows={1}
              disabled={isLoading}
            />
            <button
              type="button"
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label={translate({ id: 'chat.send', message: '送信' })}
            >
              <SendIcon />
            </button>
          </div>
          <p className={styles.inputNote}>
            <Translate id="chat.input.note">
              Enter で送信、Shift+Enter で改行。会話はページを閉じるとリセットされます。
            </Translate>
          </p>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
