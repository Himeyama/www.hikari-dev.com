import type { ChangeEvent } from "react";
import type { AiModel } from "../../lib/admin/openai";
import { AI_MODELS } from "../../lib/admin/openai";

export type AiTask = "outline" | "translate" | null;

interface AiPanelProps {
  model: AiModel;
  onModelChange: (model: AiModel) => void;
  onGenerateOutline: () => void;
  onTranslate: () => void;
  onOpenSettings: () => void;
  task: AiTask;
  disabled: boolean;
}

export function AiPanel({
  model,
  onModelChange,
  onGenerateOutline,
  onTranslate,
  onOpenSettings,
  task,
  disabled,
}: AiPanelProps) {
  const busy = task !== null;

  return (
    <>
      <span className="admin-toolbar-divider" />
      <select
        className="admin-ai-select"
        value={model}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onModelChange(e.target.value as AiModel)
        }
        disabled={busy || disabled}
        title="AI モデルを選択"
      >
        {AI_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="admin-btn admin-btn-secondary"
        onClick={onGenerateOutline}
        disabled={busy || disabled}
        title="タイトル・タグから AI で記事本文を生成"
      >
        {task === "outline" ? "生成中..." : "AI 本文生成"}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-secondary"
        onClick={onTranslate}
        disabled={busy || disabled}
        title="EN / 繁體中文に翻訳"
      >
        {task === "translate" ? "翻訳中..." : "EN/繁中翻訳"}
      </button>
      <button
        type="button"
        className="admin-btn admin-btn-secondary"
        onClick={onOpenSettings}
        disabled={busy}
        title="OpenAI API キー設定"
      >
        設定
      </button>
    </>
  );
}
