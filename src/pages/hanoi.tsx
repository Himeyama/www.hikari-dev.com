import type {ReactNode} from 'react';
import {useState, useEffect, useRef, useCallback} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './hanoi.module.css';

const DISK_COLORS = [
  '#e74c3c',
  '#e67e22',
  '#f1c40f',
  '#27ae60',
  '#3498db',
  '#9b59b6',
  '#1abc9c',
];

const PEG_LABELS = ['A', 'B', 'C'];

function buildInitialPegs(n: number): number[][] {
  const pegs: number[][] = [[], [], []];
  for (let i = n; i >= 1; i--) pegs[0].push(i);
  return pegs;
}

function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    if (startRef.current === null) startRef.current = Date.now() - elapsed * 1000;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  });

  const reset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setElapsed(0);
  }, []);

  return {elapsed, reset};
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function HanoiPage(): ReactNode {
  const [numDisks, setNumDisks] = useState(3);
  const [pegs, setPegs] = useState<number[][]>(buildInitialPegs(3));
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [invalidPeg, setInvalidPeg] = useState<number | null>(null);
  const [bestMoves, setBestMoves] = useState<Record<number, number>>({});

  const {elapsed, reset: resetTimer} = useTimer(started && !won);

  const optimal = Math.pow(2, numDisks) - 1;

  const resetGame = useCallback(
    (n: number) => {
      setPegs(buildInitialPegs(n));
      setSelected(null);
      setMoves(0);
      setWon(false);
      setStarted(false);
      setInvalidPeg(null);
      resetTimer();
    },
    [resetTimer],
  );

  const handlePegClick = (pegIdx: number) => {
    if (won) return;

    if (selected === null) {
      if (pegs[pegIdx].length === 0) return;
      setSelected(pegIdx);
    } else if (selected === pegIdx) {
      setSelected(null);
    } else {
      const from = pegs[selected];
      const to = pegs[pegIdx];
      const topFrom = from[from.length - 1];
      const topTo = to[to.length - 1];

      if (topTo !== undefined && topTo < topFrom) {
        // invalid move
        setInvalidPeg(pegIdx);
        setTimeout(() => setInvalidPeg(null), 500);
        return;
      }

      // valid move
      if (!started) setStarted(true);

      const newPegs = pegs.map((p) => [...p]);
      const disk = newPegs[selected].pop()!;
      newPegs[pegIdx].push(disk);
      setPegs(newPegs);
      setSelected(null);
      const newMoves = moves + 1;
      setMoves(newMoves);

      // check win: all disks on peg C (index 2)
      if (newPegs[2].length === numDisks) {
        setWon(true);
        setBestMoves((prev) => {
          if (prev[numDisks] === undefined || newMoves < prev[numDisks]) {
            return {...prev, [numDisks]: newMoves};
          }
          return prev;
        });
      }
    }
  };

  const handleDiskChange = (n: number) => {
    setNumDisks(n);
    resetGame(n);
  };

  const maxDiskH = 36;
  const diskH = Math.min(maxDiskH, Math.floor(200 / numDisks) - 4);

  return (
    <Layout
      title={translate({id: 'hanoi.title', message: 'ハノイの塔'})}
      description={translate({
        id: 'hanoi.description',
        message: 'ハノイの塔のミニゲーム。ディスクをクリックして棒の間を移動させよう。',
      })}
    >
      <div className={styles.pageWrapper}>
        <Heading as="h1" className={styles.pageTitle}>
          <Translate id="hanoi.title">ハノイの塔</Translate>
        </Heading>
        <p className={styles.subtitle}>
          <Translate id="hanoi.subtitle">
            A の棒のディスクをすべて C の棒へ移動させよう！
          </Translate>
        </p>

        {/* Disk selector */}
        <div className={styles.diskSelector}>
          <span className={styles.selectorLabel}>
            <Translate id="hanoi.diskCount">ディスク数</Translate>:
          </span>
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              className={`${styles.diskBtn} ${numDisks === n ? styles.diskBtnActive : ''}`}
              onClick={() => handleDiskChange(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>
              <Translate id="hanoi.moves">手数</Translate>
            </span>
            <span className={styles.statValue}>{moves}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>
              <Translate id="hanoi.optimal">最小</Translate>
            </span>
            <span className={styles.statValue}>{optimal}</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statLabel}>
              <Translate id="hanoi.time">タイム</Translate>
            </span>
            <span className={styles.statValue}>{formatTime(elapsed)}</span>
          </div>
          {bestMoves[numDisks] !== undefined && (
            <div className={styles.statBox}>
              <span className={styles.statLabel}>
                <Translate id="hanoi.best">ベスト</Translate>
              </span>
              <span className={`${styles.statValue} ${styles.bestValue}`}>
                {bestMoves[numDisks]}
              </span>
            </div>
          )}
        </div>

        {/* Win banner */}
        {won && (
          <div className={styles.winBanner}>
            <span className={styles.winEmoji}>🎉</span>
            <span className={styles.winText}>
              <Translate id="hanoi.win">クリア！</Translate>
            </span>
            <span className={styles.winDetail}>
              {moves}
              <Translate id="hanoi.movesUnit">手</Translate>
              {'・'}
              {formatTime(elapsed)}
              {moves === optimal && (
                <span className={styles.perfectBadge}>
                  {' '}
                  <Translate id="hanoi.perfect">★ 最短！</Translate>
                </span>
              )}
            </span>
          </div>
        )}

        {/* Game board */}
        <div className={styles.board}>
          {pegs.map((peg, pegIdx) => {
            const isSelected = selected === pegIdx;
            const isInvalid = invalidPeg === pegIdx;
            const canReceive =
              selected !== null &&
              selected !== pegIdx &&
              (peg.length === 0 ||
                peg[peg.length - 1] > pegs[selected][pegs[selected].length - 1]);

            return (
              <div
                key={pegIdx}
                className={`${styles.pegZone} ${isSelected ? styles.pegZoneSelected : ''} ${isInvalid ? styles.pegZoneInvalid : ''} ${canReceive ? styles.pegZoneTarget : ''}`}
                onClick={() => handlePegClick(pegIdx)}
              >
                {/* disk area */}
                <div className={styles.diskArea}>
                  <div className={styles.pegPost} />
                  <div className={styles.diskStack}>
                    {peg.map((disk, idx) => {
                      const isTopDisk = idx === peg.length - 1;
                      const isLifted = isSelected && isTopDisk;
                      return (
                        <div
                          key={disk}
                          className={`${styles.disk} ${isLifted ? styles.diskLifted : ''}`}
                          style={{
                            width: `${14 + (disk / numDisks) * 78}%`,
                            height: `${diskH}px`,
                            backgroundColor: DISK_COLORS[(disk - 1) % DISK_COLORS.length],
                          }}
                        >
                          <span className={styles.diskLabel}>{disk}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.pegBase} />
                <div className={styles.pegLabel}>{PEG_LABELS[pegIdx]}</div>
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <p className={styles.hint}>
          {selected !== null ? (
            <Translate id="hanoi.hintMove">移動先の棒をクリック</Translate>
          ) : (
            <Translate id="hanoi.hintSelect">動かしたい棒をクリック</Translate>
          )}
        </p>

        {/* Reset */}
        <div className={styles.resetRow}>
          <button className={styles.resetBtn} onClick={() => resetGame(numDisks)}>
            ↩ <Translate id="hanoi.reset">リセット</Translate>
          </button>
        </div>

        {/* Rules */}
        <div className={styles.rules}>
          <Heading as="h2" className={styles.rulesTitle}>
            <Translate id="hanoi.rulesTitle">ルール</Translate>
          </Heading>
          <ul className={styles.rulesList}>
            <li>
              <Translate id="hanoi.rule1">一度に動かせるディスクは 1 枚だけ。</Translate>
            </li>
            <li>
              <Translate id="hanoi.rule2">棒の一番上にあるディスクだけを動かせる。</Translate>
            </li>
            <li>
              <Translate id="hanoi.rule3">
                大きいディスクの上に小さいディスクを置くことはできない。
              </Translate>
            </li>
          </ul>
          <p className={styles.formula}>
            <Translate id="hanoi.formulaLabel">最小手数</Translate>:{' '}
            <code>
              2<sup>n</sup> − 1
            </code>{' '}
            ={' '}
            <strong>
              {optimal} <Translate id="hanoi.movesUnit">手</Translate>
            </strong>
          </p>
        </div>
      </div>
    </Layout>
  );
}
