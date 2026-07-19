import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import type {MiniApp} from './apps';
import {TaskbarClock} from './TaskbarClock';
import styles from './desktop.module.css';

type TaskbarWindow = {
  app: MiniApp;
  active: boolean;
};

type Props = {
  windows: TaskbarWindow[];
  onItemClick: (appId: string) => void;
};

function HomeGlyph(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 11l8-6.5 8 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9h12v-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 19v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Taskbar({windows, onItemClick}: Props): ReactNode {
  const homeLabel = translate({id: 'desktop.home', message: 'ホームへ戻る'});
  return (
    <div className={styles.taskbar}>
      <Link to="/" className={styles.homeButton} aria-label={homeLabel} title={homeLabel}>
        <HomeGlyph />
      </Link>
      <span className={styles.taskbarDivider} />
      <div className={styles.taskbarItems}>
        {windows.map(({app, active}) => (
          <button
            key={app.id}
            type="button"
            className={clsx(styles.taskbarItem, active && styles.taskbarItemActive)}
            onClick={() => onItemClick(app.id)}
          >
            <span className={styles.taskbarItemGlyph}>
              <app.Icon />
            </span>
            <span className={styles.taskbarItemLabel}>
              <Translate id={app.titleId}>{app.titleMessage}</Translate>
            </span>
          </button>
        ))}
      </div>
      <TaskbarClock />
    </div>
  );
}
