import type {KeyboardEvent, ReactNode} from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import DOMPurify from 'dompurify';
import Translate, {translate} from '@docusaurus/Translate';
import {md} from '../../lib/doc/markdown-to-ooxml';
import {
  buildContextMessage,
  getModel,
  loadApiKey,
  loadModel,
  saveModel,
  streamChat,
  type ChatMessageParam,
} from '../../lib/doc/ai-chat';
import {ApiKeyModal} from './ApiKeyModal';
import {SettingsModal} from './SettingsModal';
import styles from './styles.module.css';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DocChatPanelProps {
  source: string;
  selectedText: string;
  hasSelection: boolean;
  onApplyToSelection: (text: string) => void;
  onApplyToDocument: (text: string) => void;
  onClose: () => void;
}

function ClearIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KeyIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M11 12l8-8M17 4l2 2M14 7l2 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12l16-7-7 16-2.5-6.5L4 12z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssistantMarkdown({content}: {content: string}): ReactNode {
  const html = useMemo(
    () => DOMPurify.sanitize(md.render(content), {USE_PROFILES: {html: true}}),
    [content],
  );
  return (
    <div
      className={`${styles.assistantContent} markdown`}
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}

let idCounter = 0;
const nextId = () => `m${Date.now()}-${idCounter++}`;

export function DocChatPanel({
  source,
  selectedText,
  hasSelection,
  onApplyToSelection,
  onApplyToDocument,
  onClose,
}: DocChatPanelProps): ReactNode {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState(() => loadModel());
  const [modal, setModal] = useState<'none' | 'api' | 'model'>('none');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const historyRef = useRef<ChatMessageParam[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 送信時に最新の文書・選択範囲を参照するため ref に保持する
  const sourceRef = useRef(source);
  const selectionRef = useRef(selectedText);
  sourceRef.current = source;
  selectionRef.current = selectedText;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  const handleChangeModel = (m: string) => {
    setModel(m);
    saveModel(m);
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const apiKey = loadApiKey();
    if (!apiKey) {
      setError(
        translate({
          id: 'doc.noApiKey',
          message: 'API キーが未設定である。API 設定から入力する。',
        }),
      );
      setModal('api');
      return;
    }

    const userId = nextId();
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      {id: userId, role: 'user', content: trimmed},
      {id: assistantId, role: 'assistant', content: ''},
    ]);
    setInput('');
    setError(null);
    setIsLoading(true);
    setStreamingId(assistantId);

    const historySnapshot = historyRef.current;
    historyRef.current = [...historyRef.current, {role: 'user', content: trimmed}];

    try {
      // 毎回、最新の文書全体と選択範囲を文脈として先頭に付与する
      const context = buildContextMessage(sourceRef.current, selectionRef.current);
      const accumulated = await streamChat({
        apiKey,
        model,
        messages: [context, ...historyRef.current],
        onDelta: (text) =>
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? {...m, content: text} : m)),
          ),
      });
      historyRef.current = [...historyRef.current, {role: 'assistant', content: accumulated}];
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userId));
      historyRef.current = historySnapshot;
    } finally {
      setIsLoading(false);
      setStreamingId(null);
    }
  }, [input, isLoading, model]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    historyRef.current = [];
    setError(null);
  };

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1200);
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLabel}>
          <span className={styles.headerTitle}>
            <Translate id="doc.aiChat">AI チャット</Translate>
          </span>
          <button
            type="button"
            className={styles.modelBadge}
            onClick={() => setModal('model')}
            title={translate({id: 'doc.modelSettings', message: 'モデル設定'})}
          >
            <span className={styles.modelProvider}>{getModel(model).provider}</span>
            <span className={styles.modelName}>{getModel(model).label}</span>
          </button>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={handleClear}
            disabled={messages.length === 0}
            title={translate({id: 'doc.chatClear', message: 'チャットをクリア'})}
            aria-label={translate({id: 'doc.chatClear', message: 'チャットをクリア'})}
          >
            <ClearIcon />
          </button>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={() => setModal('api')}
            title={translate({id: 'doc.apiSettings', message: 'API 設定'})}
            aria-label={translate({id: 'doc.apiSettings', message: 'API 設定'})}
          >
            <KeyIcon />
          </button>
          <button
            type="button"
            className={styles.headerBtn}
            onClick={onClose}
            title={translate({id: 'doc.close', message: '閉じる'})}
            aria-label={translate({id: 'doc.close', message: '閉じる'})}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>
            <Translate id="doc.chatEmpty">
              文書について指示すると、選択範囲や文書全体を対象に AI が編集を提案する。
            </Translate>
          </p>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className={`${styles.messageRow} ${styles.messageRowUser}`}>
              <div className={`${styles.messageBubble} ${styles.bubbleUser}`}>
                <p className={styles.userText}>{m.content}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className={`${styles.messageRow} ${styles.messageRowAssistant}`}>
              <div className={`${styles.messageBubble} ${styles.bubbleAssistant}`}>
                {m.content ? (
                  <AssistantMarkdown content={m.content} />
                ) : (
                  <span className={styles.typing}>…</span>
                )}
                {m.content && m.id !== streamingId && (
                  <div className={styles.applyBar}>
                    <button
                      type="button"
                      className={styles.applyBtn}
                      onClick={() => onApplyToSelection(m.content)}
                      disabled={!hasSelection}
                      title={
                        hasSelection
                          ? undefined
                          : translate({
                              id: 'doc.applyToSelectionHint',
                              message: 'エディタでテキストを選択すると適用できる',
                            })
                      }
                    >
                      <Translate id="doc.applyToSelection">選択範囲に適用</Translate>
                    </button>
                    <button
                      type="button"
                      className={styles.applyBtn}
                      onClick={() => onApplyToDocument(m.content)}
                    >
                      <Translate id="doc.applyToDocument">全体に適用</Translate>
                    </button>
                    <button
                      type="button"
                      className={styles.applyBtn}
                      onClick={() => handleCopy(m.id, m.content)}
                    >
                      {copiedId === m.id ? (
                        <Translate id="doc.copied">コピーした</Translate>
                      ) : (
                        <Translate id="doc.copy">コピー</Translate>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ),
        )}
        {error && <div className={styles.error}>{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={translate({
            id: 'doc.chatPlaceholder',
            message: '指示を入力 (Enter で送信、Shift + Enter で改行)',
          })}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={() => void handleSend()}
          disabled={isLoading || !input.trim()}
          title={translate({id: 'doc.send', message: '送信'})}
          aria-label={translate({id: 'doc.send', message: '送信'})}
        >
          <SendIcon />
        </button>
      </div>

      {modal === 'api' && <ApiKeyModal onClose={() => setModal('none')} />}
      {modal === 'model' && (
        <SettingsModal
          model={model}
          onChangeModel={handleChangeModel}
          onClose={() => setModal('none')}
        />
      )}
    </div>
  );
}
