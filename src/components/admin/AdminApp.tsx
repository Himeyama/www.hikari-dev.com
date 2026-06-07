import { useCallback, useEffect, useState } from "react";

const NEW_ARTICLE_SENTINEL = "__new__";
import { api, UnauthorizedError } from "../../lib/admin/api";
import type {
  ArticleContent,
  ArticleMeta,
  CreateArticleRequest,
  FrontmatterFormState,
  Lang,
  PendingDraft,
  UpdateArticleRequest,
} from "../../lib/admin/types";
import { normalizeSlug, todayDate } from "../../lib/admin/slug";
import {
  savePendingEdits,
  loadPendingEdits,
  clearPendingEdits,
} from "../../lib/admin/useAutoSave";
import {
  generateFromPrompt,
  editWithPrompt,
  translateBoth,
  type AiModel,
} from "../../lib/admin/openai";
import { Editor } from "./Editor";
import { Preview } from "./Preview";
import { ArticleList } from "./ArticleList";
import { FrontmatterForm } from "./FrontmatterForm";
import { AiSidePanel, type AiTask } from "./AiSidePanel";
import { ApiKeyModal } from "./ApiKeyModal";
import { AdminSecretModal } from "./AdminSecretModal";

interface EditState extends PendingDraft {
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

  // Pending edits: all articles edited but not yet pushed to git.
  // Keyed by draftKey (e.g. "en:2026-06-07-my-post").
  // Does NOT include the article currently open in the editor (that's editState).
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingDraft>>(
    loadPendingEdits,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);

  const [aiModel, setAiModel] = useState<AiModel>("gpt-5.4-mini");
  const [aiTask, setAiTask] = useState<AiTask>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);

  // Auto-save the current article to pendingEdits + localStorage on every change (debounced).
  useEffect(() => {
    if (!editState?.dirty) return;
    const key = draftKey(lang, selectedFilename);
    const timer = setTimeout(() => {
      const draft: PendingDraft = {
        form: editState.form,
        body: editState.body,
        existing: editState.existing,
        lang: editState.lang,
      };
      setPendingEdits((prev) => {
        const next = { ...prev, [key]: draft };
        savePendingEdits(next);
        return next;
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [editState, lang, selectedFilename]);

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

  /**
   * Compute updated pendingEdits that includes the current editState (if dirty).
   * Use this before switching articles to avoid losing the current changes.
   */
  function pendingWithCurrent(
    current: Record<string, PendingDraft>,
  ): Record<string, PendingDraft> {
    if (!editState?.dirty) return current;
    const key = draftKey(lang, selectedFilename);
    return {
      ...current,
      [key]: {
        form: editState.form,
        body: editState.body,
        existing: editState.existing,
        lang: editState.lang,
      },
    };
  }

  async function selectArticle(filename: string) {
    if (filename === NEW_ARTICLE_SENTINEL) {
      if (selectedFilename === null && editState !== null) return; // already editing
      const newPending = pendingWithCurrent(pendingEdits);
      const newKey = draftKey(lang, null);
      const stashed = newPending[newKey];
      if (stashed) {
        const withoutNew = { ...newPending };
        delete withoutNew[newKey];
        savePendingEdits(withoutNew);
        setPendingEdits(withoutNew);
        setSelectedFilename(null);
        setEditState({ ...stashed, dirty: true });
      }
      return;
    }

    // Save current article to pending before switching.
    const newPending = pendingWithCurrent(pendingEdits);
    const newKey = draftKey(lang, filename);

    // If the target is already in pending, load from pending (and remove from map).
    const fromPending = newPending[newKey];
    if (fromPending) {
      const withoutTarget = { ...newPending };
      delete withoutTarget[newKey];
      savePendingEdits(withoutTarget);
      setPendingEdits(withoutTarget);
      setSelectedFilename(filename);
      setEditState({ ...fromPending, dirty: true });
      return;
    }

    // Otherwise save pending and fetch from API.
    savePendingEdits(newPending);
    setPendingEdits(newPending);

    setSelectedFilename(filename);
    setLoading(true);
    setError(null);
    try {
      const article = await api.articles.get(filename, lang);
      setEditState({
        existing: article,
        lang,
        form: formFromArticle(article),
        body: article.body,
        dirty: false,
      });
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  function newArticle() {
    const newPending = pendingWithCurrent(pendingEdits);
    const newKey = draftKey(lang, null);

    // Check if there's already a pending "new" article for this lang.
    const fromPending = newPending[newKey];
    if (fromPending) {
      const withoutTarget = { ...newPending };
      delete withoutTarget[newKey];
      savePendingEdits(withoutTarget);
      setPendingEdits(withoutTarget);
      setSelectedFilename(null);
      setEditState({ ...fromPending, dirty: true });
      return;
    }

    savePendingEdits(newPending);
    setPendingEdits(newPending);
    setSelectedFilename(null);
    setEditState({
      existing: null,
      lang,
      form: emptyForm(),
      body: "",
      dirty: false,
    });
  }

  async function handleLangChange(next: Lang) {
    // Compute pending that includes the current article (if dirty).
    const newPending = pendingWithCurrent(pendingEdits);
    const matchKey = selectedFilename ? draftKey(next, selectedFilename) : null;
    const matchPending = matchKey ? newPending[matchKey] : null;

    if (matchPending && matchKey) {
      // There is a pending edit for the same article in the target lang — open it.
      const withoutMatch = { ...newPending };
      delete withoutMatch[matchKey];
      savePendingEdits(withoutMatch);
      setPendingEdits(withoutMatch);
      setLang(next);
      // selectedFilename stays the same
      setEditState({ ...matchPending, dirty: true });
    } else if (selectedFilename) {
      // No pending match — save pending and try to load the same article from API.
      // Keep selectedFilename so switching back can find the pending ja/en/etc. edit.
      savePendingEdits(newPending);
      setPendingEdits(newPending);
      setLang(next);
      setEditState(null);
      setLoading(true);
      setError(null);
      try {
        const article = await api.articles.get(selectedFilename, next);
        setEditState({
          existing: article,
          lang: next,
          form: formFromArticle(article),
          body: article.body,
          dirty: false,
        });
      } catch {
        // Article doesn't exist in this lang yet — show empty editor.
        // selectedFilename is intentionally preserved so switching back
        // to the original lang can auto-restore the pending edit.
        setEditState(null);
      } finally {
        setLoading(false);
      }
    } else {
      // No article selected (new article or empty state).
      savePendingEdits(newPending);
      setPendingEdits(newPending);
      setLang(next);
      setSelectedFilename(null);
      setEditState(null);
    }
  }

  function patchForm(patch: Partial<FrontmatterFormState>) {
    setEditState((prev) => {
      if (!prev) return null;
      const changed = (Object.keys(patch) as Array<keyof FrontmatterFormState>).some(
        (k) => patch[k] !== prev.form[k],
      );
      return { ...prev, form: { ...prev.form, ...patch }, dirty: prev.dirty || changed };
    });
  }

  function patchBody(body: string) {
    setEditState((prev) =>
      prev ? { ...prev, body, dirty: prev.dirty || body !== prev.body } : null,
    );
  }

  // Number of articles with unsaved changes (current + other pending).
  function totalDirtyCount(): number {
    const currentKey = draftKey(lang, selectedFilename);
    const otherCount = Object.keys(pendingEdits).filter(
      (k) => k !== currentKey,
    ).length;
    return (editState?.dirty ? 1 : 0) + otherCount;
  }

  async function handleSave() {
    // Collect all dirty articles: pending + current (if dirty).
    const toSave: Record<string, PendingDraft> = pendingWithCurrent(pendingEdits);
    const count = Object.keys(toSave).length;
    if (count === 0) return;

    // Validate all articles before starting.
    for (const [key, draft] of Object.entries(toSave)) {
      const slug = normalizeSlug(draft.form.slug) || normalizeSlug(draft.form.title);
      if (!slug) {
        setError(`スラッグまたはタイトルを入力してください (${key})`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.form.date)) {
        setError(`日付を YYYY-MM-DD 形式で入力してください (${key})`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    const currentKey = draftKey(lang, selectedFilename);

    try {
      let savedCurrentArticle: ArticleContent | null = null;

      for (const [key, draft] of Object.entries(toSave)) {
        const { form, body, existing } = draft;
        const draftLang = draft.lang;
        const slug = normalizeSlug(form.slug) || normalizeSlug(form.title);
        const tags = splitCsv(form.tags);
        const keywords = splitCsv(form.keywords);
        const common = {
          title: form.title,
          authors: form.authors,
          tags,
          ...(form.image ? { image: form.image } : {}),
          ...(keywords.length > 0 ? { keywords } : {}),
          draft: form.draft,
          body,
        };

        let saved: ArticleContent;
        if (existing) {
          const req: UpdateArticleRequest = { ...common, sha: existing.sha };
          saved = await api.articles.update(existing.filename, existing.lang, req);
        } else {
          const req: CreateArticleRequest = {
            lang: draftLang,
            date: form.date,
            slug: slug!,
            ...common,
          };
          saved = await api.articles.create(req);
        }

        if (key === currentKey) {
          savedCurrentArticle = saved;
        }
      }

      // Clear all pending state.
      clearPendingEdits();
      setPendingEdits({});

      // Update the editor for the current article.
      if (savedCurrentArticle) {
        setSelectedFilename(savedCurrentArticle.filename);
        setEditState({
          existing: savedCurrentArticle,
          lang: savedCurrentArticle.lang,
          form: formFromArticle(savedCurrentArticle),
          body: savedCurrentArticle.body,
          dirty: false,
        });
      } else if (editState && !editState.dirty) {
        // Current article was not dirty; nothing to update.
      } else {
        // Current article was dirty but not in toSave (shouldn't happen).
        setEditState((prev) => (prev ? { ...prev, dirty: false } : null));
      }

      await loadArticles(lang);
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
      // Remove from pending if it was there.
      const key = draftKey(existing.lang, existing.filename);
      setPendingEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        savePendingEdits(next);
        return next;
      });
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
      if (mode === "create") {
        const result = await generateFromPrompt(prompt, aiModel);
        patchBody(result.body);
        const formPatch: Partial<FrontmatterFormState> = {};
        if (result.title) formPatch.title = result.title;
        if (result.slug && !editState.existing) formPatch.slug = result.slug;
        if (result.tags.length > 0) formPatch.tags = result.tags.join(", ");
        if (Object.keys(formPatch).length > 0) patchForm(formPatch);
      } else {
        const result = await editWithPrompt(editState.body, prompt, aiModel);
        patchBody(result);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setAiTask(null);
    }
  }

  async function handleTranslate() {
    if (!editState) return;
    if (editState.lang !== "ja") {
      setError("翻訳は ja 記事からのみ実行できます");
      return;
    }

    const date = editState.existing?.date ?? editState.form.date;
    const slug =
      editState.existing?.slug ??
      normalizeSlug(editState.form.slug) ??
      normalizeSlug(editState.form.title);
    if (!slug) {
      setError("翻訳前にスラッグまたはタイトルを入力してください");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("翻訳前に日付を YYYY-MM-DD 形式で入力してください");
      return;
    }
    const filename = `${date}-${slug}`;

    setAiTask("translate");
    setError(null);
    try {
      const result = await translateBoth(
        editState.form.title,
        editState.body,
        aiModel,
      );

      // Fetch existing en/zh-TW articles for their sha (if they already exist).
      const [enExisting, zhTWExisting] = await Promise.all([
        api.articles.get(filename, "en").catch(() => null),
        api.articles.get(filename, "zh-TW").catch(() => null),
      ]);

      const enDraft: PendingDraft = {
        form: { ...editState.form, title: result.en.title },
        body: result.en.body,
        existing: enExisting,
        lang: "en",
      };
      const zhTWDraft: PendingDraft = {
        form: { ...editState.form, title: result["zh-TW"].title },
        body: result["zh-TW"].body,
        existing: zhTWExisting,
        lang: "zh-TW",
      };

      const enKey = draftKey("en", filename);
      const zhTWKey = draftKey("zh-TW", filename);

      // Save current ja + add both translations to pending in one update.
      const newPending: Record<string, PendingDraft> = {
        ...pendingWithCurrent(pendingEdits),
        [enKey]: enDraft,
        [zhTWKey]: zhTWDraft,
      };
      // The en article will be open in editor, so remove it from pending.
      delete newPending[enKey];
      savePendingEdits(newPending);
      setPendingEdits(newPending);

      // Switch to en and open the translated article directly in the editor.
      setLang("en");
      setSelectedFilename(filename);
      setEditState({ ...enDraft, dirty: true });
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

  const dirtyCount = totalDirtyCount();

  // Unsaved new articles (current or stashed) are not in the API list — inject them.
  const currentIsNew = selectedFilename === null && editState !== null && editState.lang === lang;
  const pendingNewKey = draftKey(lang, null);
  const newDraftSource = currentIsNew ? editState : (pendingEdits[pendingNewKey] ?? null);
  const displayedArticles: ArticleMeta[] = newDraftSource
    ? [
        {
          filename: NEW_ARTICLE_SENTINEL,
          date: newDraftSource.form.date,
          slug: normalizeSlug(newDraftSource.form.slug) || normalizeSlug(newDraftSource.form.title) || "",
          lang,
          title: newDraftSource.form.title || "（無題）",
          authors: newDraftSource.form.authors,
          tags: splitCsv(newDraftSource.form.tags),
          draft: true,
        },
        ...articles,
      ]
    : articles;
  const listSelectedFilename = currentIsNew ? NEW_ARTICLE_SENTINEL : selectedFilename;

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-sidebar-title">CMS</span>
          {loading && (
            <span className="admin-sidebar-status">読み込み中...</span>
          )}
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
        <ArticleList
          articles={displayedArticles}
          selectedFilename={listSelectedFilename}
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
              disabled={saving || dirtyCount === 0}
            >
              {saving
                ? "保存中..."
                : dirtyCount > 0
                  ? `保存 (${dirtyCount}件)`
                  : "保存"}
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
              ) : loading ? (
                "読み込み中..."
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
                  onTranslate={handleTranslate}
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

      {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />}
      {showSecretModal && (
        <AdminSecretModal onClose={() => setShowSecretModal(false)} />
      )}
    </div>
  );
}
