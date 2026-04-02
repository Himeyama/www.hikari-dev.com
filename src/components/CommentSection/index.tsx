import React, { useEffect, useState } from 'react';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

// Translation strings
const translations = {
  ja: {
    'section.title': 'コメント',
    'form.title': 'コメントを投稿する',
    'form.name.label': 'お名前',
    'form.name.placeholder': '匿名',
    'form.rating.label': '評価',
    'form.body.label': 'コメント',
    'form.body.placeholder': 'コメントを入力してください',
    'form.required': '*',
    'form.submit': '送信する',
    'form.submitting': '送信中...',
    'form.success': 'コメントを送信しました。ありがとうございます！',
    'list.loading': '読み込み中...',
    'list.empty': 'まだコメントはありません。',
    'item.anonymous': '匿名',
  },
  en: {
    'section.title': 'Comments',
    'form.title': 'Post a Comment',
    'form.name.label': 'Name',
    'form.name.placeholder': 'Anonymous',
    'form.rating.label': 'Rating',
    'form.body.label': 'Comment',
    'form.body.placeholder': 'Enter your comment',
    'form.required': '*',
    'form.submit': 'Submit',
    'form.submitting': 'Submitting...',
    'form.success': 'Thank you for your comment!',
    'list.loading': 'Loading...',
    'list.empty': 'No comments yet.',
    'item.anonymous': 'Anonymous',
  },
  'zh-TW': {
    'section.title': '評論',
    'form.title': '發表評論',
    'form.name.label': '名稱',
    'form.name.placeholder': '匿名',
    'form.rating.label': '評分',
    'form.body.label': '評論',
    'form.body.placeholder': '請輸入您的評論',
    'form.required': '*',
    'form.submit': '送出',
    'form.submitting': '送出中...',
    'form.success': '感謝您的評論！',
    'list.loading': '載入中...',
    'list.empty': '還沒有評論。',
    'item.anonymous': '匿名',
  },
} as const;

type CommentData = {
  id: string;
  name: string;
  rating: number;
  body: string;
  date: string;
};

const API_BASE = 'https://api.hikari-dev.com/comment';

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const displayValue = onChange && hover > 0 ? hover : value;

  return (
    <span className={`${styles.stars} ${onChange ? styles.starsInteractive : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= displayValue ? styles.starFilled : styles.star}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function CommentItem({ comment, tAnonymous }: { key?: React.Key; comment: CommentData; tAnonymous: string }) {
  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <span className={styles.commentName}>{comment.name || tAnonymous}</span>
        {comment.rating > 0 && <StarRating value={comment.rating} />}
        <span className={styles.commentDate}>{comment.date}</span>
      </div>
      <p className={styles.commentBody}>{comment.body}</p>
    </div>
  );
}

export default function CommentSection() {
  const { metadata } = useBlogPost();
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale as keyof typeof translations;
  const t = (key: keyof (typeof translations)['ja']) => {
    return translations[locale]?.[key] ?? translations['ja'][key];
  };

  const postId = metadata.permalink.replace(/^\/en\//, '/');

  const [comments, setComments] = useState<CommentData[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ postId });
    fetch(`${API_BASE}?${params}`)
      .then((res) => res.json())
      .then((data: { comments: CommentData[] }) => setComments(data.comments))
      .catch(() => {
        // ダミーエンドポイントのためエラーは無視
      })
      .finally(() => setFetchLoading(false));
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, name, rating, body }),
      });
    } catch {
      // ダミーエンドポイントのためエラーは無視
    }
    setSubmitLoading(false);
    setSubmitted(true);
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{t('section.title')}</h2>

      <div className={styles.commentList}>
        {fetchLoading ? (
          <p className={styles.loadingMessage}>{t('list.loading')}</p>
        ) : comments.length === 0 ? (
          <p className={styles.emptyMessage}>{t('list.empty')}</p>
        ) : (
          comments.map((c: CommentData) => <CommentItem key={c.id} comment={c} tAnonymous={t('item.anonymous')} />)
        )}
      </div>

      <div className={styles.formContainer}>
        <h3 className={styles.formTitle}>{t('form.title')}</h3>
        {submitted ? (
          <p className={styles.successMessage}>
            {t('form.success')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t('form.name.label')}</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('form.name.placeholder')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('form.rating.label')}</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                {t('form.body.label')} <span className={styles.required}>{t('form.required')}</span>
              </label>
              <textarea
                className={styles.textarea}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('form.body.placeholder')}
                required
                rows={4}
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitLoading}
            >
              {submitLoading ? t('form.submitting') : t('form.submit')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
