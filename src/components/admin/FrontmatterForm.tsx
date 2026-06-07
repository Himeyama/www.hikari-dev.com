import type { ChangeEvent } from "react";
import type { FrontmatterFormState } from "../../lib/admin/types";
import { normalizeSlug } from "../../lib/admin/slug";

export type { FrontmatterFormState };

interface FrontmatterFormProps {
  value: FrontmatterFormState;
  disableSlug: boolean;
  disableDate: boolean;
  onChange: (patch: Partial<FrontmatterFormState>) => void;
  onImageUpload?: (file: File) => void;
}

export function FrontmatterForm({
  value,
  disableSlug,
  disableDate,
  onChange,
  onImageUpload,
}: FrontmatterFormProps) {
  return (
    <div className="admin-meta">
      <h3 className="admin-meta-heading">メタデータ</h3>

      <div className="admin-field">
        <label>タイトル</label>
        <input
          type="text"
          value={value.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ title: e.target.value })
          }
          placeholder="記事タイトル"
        />
      </div>

      <div className="admin-field">
        <label>スラッグ</label>
        <input
          type="text"
          value={value.slug}
          disabled={disableSlug}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ slug: e.target.value })
          }
          onBlur={(e) => onChange({ slug: normalizeSlug(e.target.value) })}
          placeholder="my-article-slug"
        />
      </div>

      <div className="admin-field">
        <label>日付</label>
        <input
          type="date"
          value={value.date}
          disabled={disableDate}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ date: e.target.value })
          }
        />
      </div>

      <div className="admin-field">
        <label>タグ (カンマ区切り)</label>
        <input
          type="text"
          value={value.tags}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ tags: e.target.value })
          }
          placeholder="Linux, AWS"
        />
      </div>

      <div className="admin-field">
        <label>image (OGP 画像パス)</label>
        <div className="admin-field-row">
          <input
            type="text"
            value={value.image}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ image: e.target.value })
            }
            placeholder="/img/blog/2026-05-27-foo/thumb.png"
          />
          {onImageUpload && (
            <label
              className="admin-btn admin-btn-secondary admin-btn-sm admin-upload-icon-btn"
              title="OGP 画像をアップロード"
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImageUpload(file);
                    e.target.value = "";
                  }
                }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </label>
          )}
        </div>
      </div>

      <div className="admin-field">
        <label>keywords (カンマ区切り、任意)</label>
        <input
          type="text"
          value={value.keywords}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ keywords: e.target.value })
          }
          placeholder="SEO キーワード"
        />
      </div>

      <div className="admin-field">
        <label>authors</label>
        <input
          type="text"
          value={value.authors}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ authors: e.target.value })
          }
        />
      </div>

      <div className="admin-field admin-field-inline">
        <label>
          <input
            type="checkbox"
            checked={value.draft}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange({ draft: e.target.checked })
            }
          />
          下書き (draft: true)
        </label>
      </div>
    </div>
  );
}
