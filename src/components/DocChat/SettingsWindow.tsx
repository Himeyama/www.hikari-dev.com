import type {ReactNode} from 'react';
import {useEffect, useRef, useState} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import {loadApiKey, loadBaseUrl, loadModel, normalizeBaseUrl, saveApiKey, saveBaseUrl, saveModel} from '../../lib/doc/ai-chat';
import {usePointerDrag} from '../desktop/usePointerDrag';
import styles from './styles.module.css';

export function SettingsWindow({onClose}: {onClose: () => void}): ReactNode {
  const [model, setModel] = useState(loadModel);
  const [baseUrl, setBaseUrl] = useState(loadBaseUrl);
  const [apiKey, setApiKey] = useState(loadApiKey);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({x: 24, y: 36});
  const ref = useRef<HTMLDivElement>(null);

  const move = (x: number, y: number) => {
    const child = ref.current;
    const parent = child?.parentElement;
    if (!child || !parent) return;
    const next = {
      x: Math.max(0, Math.min(x, parent.clientWidth - child.offsetWidth)),
      y: Math.max(0, Math.min(y, parent.clientHeight - child.offsetHeight)),
    };
    setPosition(prev => prev.x === next.x && prev.y === next.y ? prev : next);
  };
  const drag = usePointerDrag({getStart: () => position, onMove: move});

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const observer = new ResizeObserver(() => {
      const child = ref.current;
      if (!child) return;
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, parent.clientWidth - child.offsetWidth)),
        y: Math.max(0, Math.min(prev.y, parent.clientHeight - child.offsetHeight)),
      }));
    });
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`window ${styles.settingsWindow}`} role="dialog" aria-modal={false}
      aria-labelledby="doc-settings-title" style={{left: position.x, top: position.y}}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      }}>
      <div className={`title-bar ${styles.settingsTitleBar}`} tabIndex={0}
        onPointerDown={event => {
          if (!(event.target as HTMLElement).closest('button')) drag(event);
        }}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return;
          const offsets = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10]};
          const offset = offsets[event.key as keyof typeof offsets];
          if (offset) { event.preventDefault(); move(position.x + offset[0], position.y + offset[1]); }
        }}>
        <span id="doc-settings-title" className="title-bar-text"><Translate id="doc.apiSettings">API 設定</Translate></span>
        <div className="title-bar-controls">
          <button type="button" className={styles.settingsClose} onClick={onClose}
            aria-label={translate({id: 'doc.close', message: '閉じる'})}>
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
      <form className={styles.settingsForm} onSubmit={event => {
        event.preventDefault();
        let normalized: string;
        try { normalized = normalizeBaseUrl(baseUrl); }
        catch {
          setError(translate({id: 'doc.baseUrl.invalid', message: '有効な HTTP または HTTPS のベース URL を入力してください。'}));
          return;
        }
        saveModel(model.trim());
        saveBaseUrl(normalized);
        saveApiKey(apiKey);
        onClose();
      }}>
        <div className={styles.field}>
          <label htmlFor="doc-ai-model"><Translate id="doc.modelName">モデル名</Translate></label>
          <input id="doc-ai-model" value={model} onChange={event => setModel(event.target.value)}
            required pattern=".*\S.*" autoFocus autoComplete="off" spellCheck={false} />
        </div>
        <div className={styles.field}>
          <label htmlFor="doc-ai-base-url"><Translate id="doc.baseUrl">ベース URL</Translate></label>
          <input id="doc-ai-base-url" type="url" value={baseUrl}
            onChange={event => { setBaseUrl(event.target.value); setError(''); }} required autoComplete="off" spellCheck={false} />
        </div>
        <div className={styles.field}>
          <label htmlFor="doc-ai-key"><Translate id="doc.apiKey">API キー</Translate></label>
          <div className={styles.keyRow}>
            <input id="doc-ai-key" type={showKey ? 'text' : 'password'} value={apiKey}
              onChange={event => setApiKey(event.target.value)} autoComplete="off" spellCheck={false} />
            <button type="button" onClick={() => setShowKey(value => !value)} aria-pressed={showKey}>
              {showKey ? <Translate id="doc.hide">非表示</Translate> : <Translate id="doc.show">表示</Translate>}
            </button>
          </div>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.settingsActions}>
          <button type="button" onClick={onClose}><Translate id="doc.cancel">キャンセル</Translate></button>
          <button type="submit"><Translate id="doc.save">保存</Translate></button>
        </div>
      </form>
    </div>
  );
}
