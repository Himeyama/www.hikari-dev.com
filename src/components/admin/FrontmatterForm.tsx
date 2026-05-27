import type { ChangeEvent } from "react";
import { normalizeSlug } from "../../lib/admin/slug";

export interface FrontmatterFormState {
  title: string;
  slug: string;
  date: string;
  tags: string;
  image: string;
  keywords: string;
  draft: boolean;
  authors: string;
}

interface FrontmatterFormProps {
  value: FrontmatterFormState;
  disableSlug: boolean;
  disableDate: boolean;
  onChange: (patch: Partial<FrontmatterFormState>) => void;
}

export function FrontmatterForm({
  value,
  disableSlug,
  disableDate,
  onChange,
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
        <input
          type="text"
          value={value.image}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange({ image: e.target.value })
          }
          placeholder="/img/blog/2026-05-27-foo/thumb.png"
        />
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
