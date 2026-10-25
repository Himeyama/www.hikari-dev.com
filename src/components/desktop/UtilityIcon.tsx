import type {ReactNode} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

/** Display an icon from the original transparent system atlas without changing its pixels. */
export function createSystemIcon(x: number, y: number, width: number, height: number): () => ReactNode {
  return function SystemIcon(): ReactNode {
    const src = useBaseUrl('/img/mini-apps/windows-98-system.png');
    return (
      <svg width="22" height="22" viewBox={`${x} ${y} ${width} ${height}`} aria-hidden="true" focusable="false"
        style={{overflow: 'hidden', imageRendering: 'pixelated'}}>
        <image href={src} width="1254" height="1254" />
      </svg>
    );
  };
}

/** Read one cell of the supplied 4 × 4 atlas without altering its pixels. */
export function createUtilityIcon(
  index: number,
  sheet = 'windows-98-utilities.png',
  cellHeight = 24,
): () => ReactNode {
  const x = -(index % 4) * 24;
  const y = -Math.floor(index / 4) * 24;

  return function UtilityIcon(): ReactNode {
    const src = useBaseUrl(`/img/mini-apps/${sheet}`);
    return (
      <svg
        width="22"
        height="22"
        viewBox={`0 0 24 ${cellHeight}`}
        aria-hidden="true"
        focusable="false"
        style={{overflow: 'hidden', imageRendering: 'pixelated'}}>
        <image href={src} x={x} y={y} width="96" height="96" />
      </svg>
    );
  };
}
