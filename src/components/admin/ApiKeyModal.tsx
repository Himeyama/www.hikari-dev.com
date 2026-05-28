import { type ChangeEvent, type MouseEvent, useState } from "react";
import {
  API_KEY_STORAGE,
  ANTHROPIC_API_KEY_STORAGE,
} from "../../lib/admin/openai";

interface ApiKeyModalProps {
  onClose: () => void;
}

export function ApiKeyModal({ onClose }: ApiKeyModalProps) {
  const [openaiKey, setOpenaiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(API_KEY_STORAGE) ?? "";
  });
  const [anthropicKey, setAnthropicKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(ANTHROPIC_API_KEY_STORAGE) ?? "";
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const trimmedOpenai = openaiKey.trim();
    if (trimmedOpenai) {
      localStorage.setItem(API_KEY_STORAGE, trimmedOpenai);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    const trimmedAnthropic = anthropicKey.trim();
    if (trimmedAnthropic) {
      localStorage.setItem(ANTHROPIC_API_KEY_STORAGE, trimmedAnthropic);
    } else {
      localStorage.removeItem(ANTHROPIC_API_KEY_STORAGE);
    }
    setSaved(true);
    setTimeout(onClose, 700);
  }

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="admin-modal-overlay" onClick={handleOverlayClick}>
      <div className="admin-modal admin-modal-sm">
        <div className="admin-modal-header">
          <span className="admin-modal-title">AI API キー設定</span>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="admin-modal-body">
          <div className="admin-field">
            <label>OpenAI API キー</label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setOpenaiKey(e.target.value);
                setSaved(false);
              }}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="admin-field">
            <label>Anthropic API キー (Claude 用)</label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setAnthropicKey(e.target.value);
                setSaved(false);
              }}
              placeholder="sk-ant-..."
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <p className="admin-modal-hint">
            ブラウザの localStorage に保存される。サーバーには送信されない。
          </p>
        </div>
        <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleSave}
            disabled={saved}
          >
            {saved ? "保存しました" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
