import {useEffect, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './desktop.module.css';

function ChevronLeftGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}/${m}/${day}`;
}

export function TaskbarClock(): ReactNode {
  const {i18n} = useDocusaurusContext();
  const locale = i18n.currentLocale;
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  // null の間は今月を表示する (時刻が月をまたいでも追従)
  const [viewYm, setViewYm] = useState<{y: number; m: number} | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // 日曜始まりの曜日ラベル (2023-01-01 は日曜)
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, {weekday: 'narrow'});
    return Array.from({length: 7}, (_, i) => fmt.format(new Date(2023, 0, 1 + i)));
  }, [locale]);

  const view = viewYm ?? {y: now.getFullYear(), m: now.getMonth()};
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {year: 'numeric', month: 'long'}).format(
        new Date(view.y, view.m, 1),
      ),
    [locale, view.y, view.m],
  );

  // 前月・翌月の日付も含めて常に 6 行 (42 セル) にする
  const cells = useMemo(() => {
    const firstDow = new Date(view.y, view.m, 1).getDay();
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const daysInPrevMonth = new Date(view.y, view.m, 0).getDate();
    const list: Array<{day: number; inMonth: boolean}> = [];
    for (let i = firstDow - 1; i >= 0; i -= 1) {
      list.push({day: daysInPrevMonth - i, inMonth: false});
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push({day, inMonth: true});
    }
    for (let day = 1; list.length < 42; day += 1) {
      list.push({day, inMonth: false});
    }
    return list;
  }, [view.y, view.m]);

  const isCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  const moveMonth = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    setViewYm({y: d.getFullYear(), m: d.getMonth()});
  };

  const calendarLabel = translate({id: 'desktop.clock.calendar', message: 'カレンダー'});
  const prevLabel = translate({id: 'desktop.clock.prevMonth', message: '前の月'});
  const nextLabel = translate({id: 'desktop.clock.nextMonth', message: '次の月'});

  return (
    <div ref={rootRef} className={styles.clockWrap}>
      <button
        type="button"
        className={styles.clockButton}
        aria-label={calendarLabel}
        title={calendarLabel}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setViewYm(null);
        }}
      >
        <span className={styles.clockTime}>{formatTime(now)}</span>
        <span className={styles.clockDate}>{formatDate(now)}</span>
      </button>
      {open && (
        <div className={styles.calendar} role="dialog" aria-label={calendarLabel}>
          <div className={styles.calendarHeader}>
            <span className={styles.calendarTitle}>{monthLabel}</span>
            <div className={styles.calendarNavGroup}>
              <button
                type="button"
                className={styles.calendarNav}
                aria-label={prevLabel}
                title={prevLabel}
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeftGlyph />
              </button>
              <button
                type="button"
                className={styles.calendarNav}
                aria-label={nextLabel}
                title={nextLabel}
                onClick={() => moveMonth(1)}
              >
                <ChevronRightGlyph />
              </button>
            </div>
          </div>
          <div className={styles.calendarGrid}>
            {weekdayLabels.map((label, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={`w-${i}`} className={styles.calendarWeekday}>
                {label}
              </span>
            ))}
            {cells.map((cell, i) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={`d-${i}`}
                className={clsx(
                  styles.calendarDay,
                  !cell.inMonth && styles.calendarOutside,
                  cell.inMonth && isCurrentMonth && cell.day === now.getDate() && styles.calendarToday,
                )}
              >
                {cell.day}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
