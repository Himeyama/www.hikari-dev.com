import React, { useEffect, useState } from 'react';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { translate } from '@docusaurus/Translate';
import styles from './styles.module.css';

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

  // Translation getter using i18n JSON
  const t = (id: string, message: string): string => {
    return translate({
      id: `comment.${id}`,
      message,
    });
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
      <h2 className={styles.sectionTitle}>{t('section.title', 'Comments')}</h2>

      <div className={styles.commentList}>
        {fetchLoading ? (
          <p className={styles.loadingMessage}>{t('list.loading', 'Loading...')}</p>
        ) : comments.length === 0 ? (
          <p className={styles.emptyMessage}>{t('list.empty', 'No comments yet.')}</p>
        ) : (
          comments.map((c: CommentData) => <CommentItem key={c.id} comment={c} tAnonymous={t('item.anonymous', 'Anonymous')} />)
        )}
      </div>

      <div className={styles.formContainer}>
        <h3 className={styles.formTitle}>{t('form.title', 'Post a Comment')}</h3>
        {submitted ? (
          <p className={styles.successMessage}>
            {t('form.success', 'Thank you for your comment!')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t('form.name.label', 'Name')}</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('form.name.placeholder', 'Anonymous')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t('form.rating.label', 'Rating')}</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                {t('form.body.label', 'Comment')} <span className={styles.required}>{t('form.required', '*')}</span>
              </label>
              <textarea
                className={styles.textarea}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t('form.body.placeholder', 'Enter your comment')}
                required
                rows={4}
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitLoading}
            >
              {submitLoading ? t('form.submitting', 'Submitting...') : t('form.submit', 'Submit')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
