import type { ArticleMeta, Lang } from "../../lib/admin/types";
import { LANGS } from "../../lib/admin/types";

interface ArticleListProps {
  articles: ArticleMeta[];
  selectedFilename: string | null;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onSelect: (filename: string) => void;
}

const LANG_LABEL: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  "zh-TW": "繁體中文",
};

export function ArticleList({
  articles,
  selectedFilename,
  lang,
  onLangChange,
  onSelect,
}: ArticleListProps) {
  return (
    <div className="admin-sidebar-list-wrap">
      <div className="admin-lang-switch">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            className={`admin-lang-btn${l === lang ? " active" : ""}`}
            onClick={() => onLangChange(l)}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
      {articles.length === 0 ? (
        <div className="admin-sidebar-empty">記事がありません</div>
      ) : (
        <div className="admin-sidebar-list">
          {articles.map((article) => (
            <div
              key={article.filename}
              className={`admin-article-item${
                selectedFilename === article.filename ? " active" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(article.filename)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(article.filename);
              }}
            >
              <div className="admin-article-item-title">{article.title}</div>
              <div className="admin-article-item-meta">
                <time dateTime={article.date}>{article.date}</time>
                {article.draft && <span className="admin-status-badge draft">draft</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
