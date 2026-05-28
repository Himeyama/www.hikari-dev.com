import { useState, type ChangeEvent } from "react";
import type { AiModel } from "../../lib/admin/openai";
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  CLAUDE_MODEL_LABELS,
} from "../../lib/admin/openai";

export type AiTask = "ai" | "translate-en" | "translate-zh-TW" | null;
type AiMode = "auto" | "create" | "edit";

interface AiSidePanelProps {
  body: string;
  model: AiModel;
  onModelChange: (model: AiModel) => void;
  onGenerate: (prompt: string, mode: "create" | "edit") => Promise<void>;
  onTranslateEn: () => void;
  onTranslateZhTW: () => void;
  onOpenSettings: () => void;
  task: AiTask;
}

export function AiSidePanel({
  body,
  model,
  onModelChange,
  onGenerate,
  onTranslateEn,
  onTranslateZhTW,
  onOpenSettings,
  task,
}: AiSidePanelProps) {
  const [mode, setMode] = useState<AiMode>("auto");
  const [prompt, setPrompt] = useState("");
  const busy = task !== null;

  const effectiveMode: "create" | "edit" =
    mode === "auto" ? (body.trim() ? "edit" : "create") : mode;

  async function handleExecute() {
    if (!prompt.trim()) return;
    await onGenerate(prompt, effectiveMode);
    setPrompt("");
  }

  return (
    <div className="admin-ai-panel">
      <div className="admin-ai-panel-header">AI アシスタント</div>

      <div className="admin-ai-section">
        <div className="admin-ai-section-label">モード</div>
        <div className="admin-ai-mode-group">
          {(["auto", "create", "edit"] as AiMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`admin-ai-mode-btn${mode === m ? " active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "auto" ? "自動" : m === "create" ? "新規作成" : "編集"}
            </button>
          ))}
        </div>
        {mode === "auto" && (
          <div className="admin-ai-mode-hint">
            {effectiveMode === "create" ? "▸ 新規作成" : "▸ 編集"}
          </div>
        )}
      </div>

      <div className="admin-ai-section">
        <div className="admin-ai-section-label">モデル</div>
        <select
          className="admin-ai-model-select"
          value={model}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onModelChange(e.target.value as AiModel)
          }
          disabled={busy}
        >
          <optgroup label="OpenAI">
            {OPENAI_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </optgroup>
          <optgroup label="Claude (Anthropic)">
            {CLAUDE_MODELS.map((m) => (
              <option key={m} value={m}>
                {CLAUDE_MODEL_LABELS[m]}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="admin-ai-prompt-section">
        <div className="admin-ai-section-label">プロンプト</div>
        <textarea
          className="admin-ai-prompt-textarea"
          value={prompt}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setPrompt(e.target.value)
          }
          placeholder={
            effectiveMode === "create"
              ? "記事のテーマや内容を入力..."
              : "編集の指示を入力..."
          }
          disabled={busy}
        />
      </div>

      <div className="admin-ai-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-ai-execute-btn"
          onClick={handleExecute}
          disabled={busy || !prompt.trim()}
        >
          {busy && task === "ai" ? "実行中..." : "実行"}
        </button>
      </div>

      <div className="admin-ai-secondary-actions">
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={onTranslateEn}
          disabled={busy || !body.trim()}
          title="英語に翻訳"
        >
          {task === "translate-en" ? "翻訳中..." : "EN 翻訳"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={onTranslateZhTW}
          disabled={busy || !body.trim()}
          title="繁體中文に翻訳"
        >
          {task === "translate-zh-TW" ? "翻訳中..." : "繁中翻訳"}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={onOpenSettings}
          disabled={busy}
        >
          設定
        </button>
      </div>
    </div>
  );
}
