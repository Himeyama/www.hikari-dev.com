import { type ChangeEvent, type MouseEvent, useState } from "react";
import { getAdminSecret, setAdminSecret } from "../../lib/admin/api";

interface AdminSecretModalProps {
  onClose: () => void;
}

export function AdminSecretModal({ onClose }: AdminSecretModalProps) {
  const [value, setValue] = useState(() => getAdminSecret() ?? "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setAdminSecret(value.trim() || null);
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
          <span className="admin-modal-title">管理者シークレット設定</span>
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
            <label>管理者シークレット</label>
            <input
              type="password"
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setValue(e.target.value);
                setSaved(false);
              }}
              placeholder="wrangler secret put ADMIN_SECRET で設定した値"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>
          <p className="admin-modal-hint">
            ブラウザの localStorage に保存される。Workers の ADMIN_SECRET シークレットと一致する必要がある。
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
