import React, { useEffect, useState } from 'react';
import { useBlogPost } from '@docusaurus/plugin-content-blog/client';
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
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${styles.star} ${star <= (onChange ? hover || value : value) ? styles.starFilled : ''}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ cursor: onChange ? 'pointer' : 'default' }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function CommentItem({ comment }: { key?: React.Key; comment: CommentData }) {
  return (
    <div className={styles.comment}>
      <div className={styles.commentHeader}>
        <span className={styles.commentName}>{comment.name || '匿名'}</span>
        {comment.rating > 0 && <StarRating value={comment.rating} />}
        <span className={styles.commentDate}>{comment.date}</span>
      </div>
      <p className={styles.commentBody}>{comment.body}</p>
    </div>
  );
}

export default function CommentSection() {
  const { metadata } = useBlogPost();
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
      <h2 className={styles.sectionTitle}>コメント</h2>

      <div className={styles.commentList}>
        {fetchLoading ? (
          <p className={styles.loadingMessage}>読み込み中...</p>
        ) : comments.length === 0 ? (
          <p className={styles.emptyMessage}>まだコメントはありません。</p>
        ) : (
          comments.map((c: CommentData) => <CommentItem key={c.id} comment={c} />)
        )}
      </div>

      <div className={styles.formContainer}>
        <h3 className={styles.formTitle}>コメントを投稿する</h3>
        {submitted ? (
          <p className={styles.successMessage}>
            コメントを送信しました。ありがとうございます！
          </p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>お名前</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="匿名"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>評価</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                コメント <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="コメントを入力してください"
                required
                rows={4}
              />
            </div>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitLoading}
            >
              {submitLoading ? '送信中...' : '送信する'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
