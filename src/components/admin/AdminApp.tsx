import { useCallback, useEffect, useState } from "react";
import { api, UnauthorizedError } from "../../lib/admin/api";
import type {
  ArticleContent,
  ArticleMeta,
  CreateArticleRequest,
  Lang,
  UpdateArticleRequest,
} from "../../lib/admin/types";
import { normalizeSlug, todayDate } from "../../lib/admin/slug";
import { clearDraft, loadDraft, useAutoSave } from "../../lib/admin/useAutoSave";
import {
  generateFromPrompt,
  editWithPrompt,
  translateToEn,
  translateToZhTW,
  type AiModel,
  type TranslationResult,
} from "../../lib/admin/openai";
import { Editor } from "./Editor";
import { Preview } from "./Preview";
import { ArticleList } from "./ArticleList";
import { FrontmatterForm, type FrontmatterFormState } from "./FrontmatterForm";
import { AiSidePanel, type AiTask } from "./AiSidePanel";
import { TranslationModal } from "./TranslationModal";
import { ApiKeyModal } from "./ApiKeyModal";
import { AdminSecretModal } from "./AdminSecretModal";

interface EditState {
  existing: ArticleContent | null;
  lang: Lang;
  form: FrontmatterFormState;
  body: string;
  dirty: boolean;
}

function emptyForm(): FrontmatterFormState {
  return {
    title: "新しい記事",
    slug: "",
    date: todayDate(),
    tags: "",
    image: "",
    keywords: "",
    draft: true,
    authors: "hikari",
  };
}

function formFromArticle(article: ArticleContent): FrontmatterFormState {
  return {
    title: article.title,
    slug: article.slug,
    date: article.date,
    tags: article.tags.join(", "),
    image: article.image ?? "",
    keywords: (article.keywords ?? []).join(", "),
    draft: article.draft ?? false,
    authors: article.authors,
  };
}

function draftKey(lang: Lang, filename: string | null): string {
  return `${lang}:${filename ?? "new"}`;
}

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function AdminApp() {
  const [lang, setLang] = useState<Lang>("ja");
  const [articles, setArticles] = useState<ArticleMeta[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);

  const [aiModel, setAiModel] = useState<AiModel>("gpt-5.4-mini");
  const [aiTask, setAiTask] = useState<AiTask>(null);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(
    null,
  );
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);

  useAutoSave(draftKey(lang, selectedFilename), editState?.body ?? "");

  function handleError(e: unknown): void {
    if (e instanceof UnauthorizedError) {
      setShowSecretModal(true);
    }
    setError(e instanceof Error ? e.message : "エラーが発生しました");
  }

  const loadArticles = useCallback(async (l: Lang) => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.articles.list(l);
      setArticles(list);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles(lang);
  }, [lang, loadArticles]);

  async function selectArticle(filename: string) {
    setSelectedFilename(filename);
    setLoading(true);
    setError(null);
    try {
      const article = await api.articles.get(filename, lang);
      const draft = loadDraft(draftKey(lang, filename));
      setEditState({
        existing: article,
        lang,
        form: formFromArticle(article),
        body: draft ?? article.body,
        dirty: draft !== null,
      });
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  function newArticle() {
    setSelectedFilename(null);
    setEditState({
      existing: null,
      lang,
      form: emptyForm(),
      body: "",
      dirty: false,
    });
  }

  function handleLangChange(next: Lang) {
    if (editState?.dirty) {
      if (!confirm("未保存の変更があります。言語を切り替えますか?")) return;
    }
    setLang(next);
    setSelectedFilename(null);
    setEditState(null);
  }

  function patchForm(patch: Partial<FrontmatterFormState>) {
    setEditState((prev) => {
      if (!prev) return null;
      return { ...prev, form: { ...prev.form, ...patch }, dirty: true };
    });
  }

  function patchBody(body: string) {
    setEditState((prev) => (prev ? { ...prev, body, dirty: true } : null));
  }

  async function handleSave() {
    if (!editState) return;
    const { form, body, existing } = editState;
    const slug = normalizeSlug(form.slug) || normalizeSlug(form.title);
    if (!slug) {
      setError("スラッグまたはタイトルを入力してください");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError("日付を YYYY-MM-DD 形式で入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tags = splitCsv(form.tags);
      const keywords = splitCsv(form.keywords);
      const common = {
        title: form.title,
        authors: form.authors,
        tags,
        ...(form.image ? { image: form.image } : {}),
        ...(keywords.length > 0 ? { keywords } : {}),
        ...(form.draft ? { draft: true as const } : {}),
        body,
      };
      let saved: ArticleContent;
      if (existing) {
        const req: UpdateArticleRequest = {
          ...common,
          sha: existing.sha,
        };
        saved = await api.articles.update(existing.filename, existing.lang, req);
      } else {
        const req: CreateArticleRequest = {
          lang: editState.lang,
          date: form.date,
          slug,
          ...common,
        };
        saved = await api.articles.create(req);
      }
      clearDraft(draftKey(editState.lang, existing?.filename ?? null));
      setSelectedFilename(saved.filename);
      setEditState({
        existing: saved,
        lang: saved.lang,
        form: formFromArticle(saved),
        body: saved.body,
        dirty: false,
      });
      await loadArticles(editState.lang);
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editState?.existing) return;
    const { existing } = editState;
    if (!confirm(`「${existing.title}」(${existing.lang}) を削除しますか?`)) return;
    try {
      await api.articles.delete(existing.filename, existing.lang, existing.sha);
      clearDraft(draftKey(existing.lang, existing.filename));
      setSelectedFilename(null);
      setEditState(null);
      await loadArticles(lang);
    } catch (e) {
      handleError(e);
    }
  }

  async function handleImageDrop(file: File) {
    if (!editState) return;
    const date = editState.form.date;
    const slug = normalizeSlug(editState.form.slug) || normalizeSlug(editState.form.title);
    if (!date || !slug) {
      setError("画像アップロード前に日付とスラッグを設定してください");
      return;
    }
    try {
      const result = await api.images.upload(file, date, slug, file.name);
      const md = `\n![${file.name}](${result.url})\n`;
      setEditState((prev) =>
        prev ? { ...prev, body: prev.body + md, dirty: true } : null,
      );
    } catch (e) {
      handleError(e);
    }
  }

  async function handleOgpImageUpload(file: File) {
    if (!editState) return;
    const date = editState.form.date;
    const slug = normalizeSlug(editState.form.slug) || normalizeSlug(editState.form.title);
    if (!date || !slug) {
      setError("画像アップロード前に日付とスラッグを設定してください");
      return;
    }
    try {
      const result = await api.images.upload(file, date, slug, file.name);
      patchForm({ image: result.url });
    } catch (e) {
      handleError(e);
    }
  }

  async function handleAiGenerate(prompt: string, mode: "create" | "edit") {
    if (!editState) return;
    setAiTask("ai");
    setError(null);
    try {
      const result =
        mode === "create"
          ? await generateFromPrompt(prompt, aiModel)
          : await editWithPrompt(editState.body, prompt, aiModel);
      patchBody(result);
    } catch (e) {
      handleError(e);
    } finally {
      setAiTask(null);
    }
  }

  async function handleTranslateEn() {
    if (!editState?.body) return;
    if (editState.lang !== "ja") {
      setError("翻訳は ja 記事からのみ実行できます");
      return;
    }
    setAiTask("translate-en");
    setError(null);
    try {
      const en = await translateToEn(editState.body, aiModel);
      setTranslationResult({ en });
    } catch (e) {
      handleError(e);
    } finally {
      setAiTask(null);
    }
  }

  async function handleTranslateZhTW() {
    if (!editState?.body) return;
    if (editState.lang !== "ja") {
      setError("翻訳は ja 記事からのみ実行できます");
      return;
    }
    setAiTask("translate-zh-TW");
    setError(null);
    try {
      const zhTW = await translateToZhTW(editState.body, aiModel);
      setTranslationResult({ "zh-TW": zhTW });
    } catch (e) {
      handleError(e);
    } finally {
      setAiTask(null);
    }
  }

  async function handleBuild() {
    setBuilding(true);
    setError(null);
    try {
      await api.build();
    } catch (e) {
      handleError(e);
    } finally {
      setBuilding(false);
    }
  }

  async function handleApplyTranslation(targetLang: "en" | "zh-TW", content: string) {
    if (!editState?.existing) {
      setError("先に ja 記事を保存してください");
      return;
    }
    const src = editState.existing;
    setSaving(true);
    setError(null);
    try {
      const req: CreateArticleRequest = {
        lang: targetLang,
        date: src.date,
        slug: src.slug,
        title: src.title,
        authors: src.authors,
        tags: src.tags,
        ...(src.image ? { image: src.image } : {}),
        ...(src.keywords ? { keywords: src.keywords } : {}),
        ...(src.draft ? { draft: true as const } : {}),
        body: content,
      };
      await api.articles.create(req);
      if (lang === targetLang) await loadArticles(targetLang);
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">CMS</span>
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-sm"
            onClick={newArticle}
            title="新規作成"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        {loading && !editState && (
          <div className="admin-sidebar-empty">読み込み中...</div>
        )}
        <ArticleList
          articles={articles}
          selectedFilename={selectedFilename}
          lang={lang}
          onLangChange={handleLangChange}
          onSelect={selectArticle}
        />
      </aside>

      {editState ? (
        <div className="admin-editor-pane">
          <div className="admin-toolbar">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "保存中..." : editState.existing ? "保存" : "作成"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={handleBuild}
              disabled={building}
            >
              {building ? "ビルド中..." : "ビルド"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "プレビュー非表示" : "プレビュー表示"}
            </button>
            {editState.existing && (
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                onClick={handleDelete}
              >
                削除
              </button>
            )}
            <label
              className="admin-btn admin-btn-secondary"
              title="画像をアップロードして本文に挿入 (ドラッグ&ドロップも可)"
              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleImageDrop(file);
                    e.target.value = "";
                  }
                }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              画像
            </label>
            <span className="admin-toolbar-divider" />
            <button
              type="button"
              className={`admin-btn admin-btn-secondary${showAiPanel ? " admin-btn-active" : ""}`}
              onClick={() => setShowAiPanel((v: boolean) => !v)}
              title="AI パネルの表示/非表示"
            >
              AI
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => setShowSecretModal(true)}
              title="管理者シークレット設定"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="7.5" cy="15.5" r="5.5"/>
                <path d="m21 2-9.6 9.6"/>
                <path d="m15.5 7.5 3 3L22 7l-3-3"/>
              </svg>
            </button>
            <span className="admin-toolbar-status">
              {error ? (
                <span className="admin-toolbar-error">{error}</span>
              ) : editState.dirty ? (
                "未保存"
              ) : (
                ""
              )}
            </span>
          </div>

          <div className="admin-editor-body">
            <div className="admin-editor-col">
              <Editor
                value={editState.body}
                onChange={patchBody}
                onImageDrop={handleImageDrop}
              />
            </div>
            {showPreview && (
              <div className="admin-preview-col">
                <Preview content={editState.body} />
              </div>
            )}
            <aside className="admin-meta-col">
              <FrontmatterForm
                value={editState.form}
                disableSlug={editState.existing !== null}
                disableDate={editState.existing !== null}
                onChange={patchForm}
                onImageUpload={handleOgpImageUpload}
              />
              {editState.existing && (
                <div className="admin-meta-info">
                  <div>filename: {editState.existing.filename}</div>
                  <div>lang: {editState.existing.lang}</div>
                  <div>sha: {editState.existing.sha.slice(0, 8)}</div>
                </div>
              )}
            </aside>
            {showAiPanel && (
              <aside className="admin-ai-col">
                <AiSidePanel
                  body={editState.body}
                  model={aiModel}
                  onModelChange={setAiModel}
                  onGenerate={handleAiGenerate}
                  onTranslateEn={handleTranslateEn}
                  onTranslateZhTW={handleTranslateZhTW}
                  onOpenSettings={() => setShowApiKeyModal(true)}
                  task={aiTask}
                />
              </aside>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-empty-state">
          記事を選択、または「+」で新規作成
        </div>
      )}

      {translationResult && (
        <TranslationModal
          result={translationResult}
          onApply={handleApplyTranslation}
          onClose={() => setTranslationResult(null)}
        />
      )}

      {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />}
      {showSecretModal && (
        <AdminSecretModal onClose={() => setShowSecretModal(false)} />
      )}
    </div>
  );
}
