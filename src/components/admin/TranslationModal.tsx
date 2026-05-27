import { type MouseEvent, useState } from "react";
import type { TranslationResult } from "../../lib/admin/openai";

type TabKey = "en" | "zh-TW";

interface TranslationModalProps {
  result: TranslationResult;
  onApply: (lang: TabKey, content: string) => void;
  onClose: () => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "en", label: "English" },
  { key: "zh-TW", label: "繁體中文" },
];

export function TranslationModal({ result, onApply, onClose }: TranslationModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("en");
  const [copied, setCopied] = useState(false);
  const content = result[activeTab];

  function handleOverlayClick(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="admin-modal-overlay" onClick={handleOverlayClick}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <span className="admin-modal-title">翻訳結果</span>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        <div className="admin-modal-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`admin-modal-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => {
                setActiveTab(tab.key);
                setCopied(false);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="admin-modal-body">
          <textarea className="admin-modal-textarea" value={content} readOnly />
        </div>
        <div className="admin-modal-footer">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={handleCopy}
          >
            {copied ? "コピー済み" : "コピー"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => {
              onApply(activeTab, content);
              onClose();
            }}
          >
            {activeTab === "en" ? "EN として保存" : "繁中として保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
