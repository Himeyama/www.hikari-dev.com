import { type ChangeEvent, type MouseEvent, useState } from "react";
import { API_KEY_STORAGE } from "../../lib/admin/openai";

interface ApiKeyModalProps {
  onClose: () => void;
}

export function ApiKeyModal({ onClose }: ApiKeyModalProps) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(API_KEY_STORAGE) ?? "";
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
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
          <span className="admin-modal-title">OpenAI API キー設定</span>
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
            <label>API キー</label>
            <input
              type="password"
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setValue(e.target.value);
                setSaved(false);
              }}
              placeholder="sk-..."
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
