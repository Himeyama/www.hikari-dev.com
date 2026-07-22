import type {ReactNode} from 'react';
import {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Translate, {translate} from '@docusaurus/Translate';
import * as vfs from '@site/src/lib/desktop/vfs';
import {getBlob} from '@site/src/lib/desktop/blobStore';
import {mediaKindOf, mimeTypeOf} from '@site/src/lib/desktop/mediaTypes';
import type {MediaKind} from '@site/src/lib/desktop/mediaTypes';
import {downloadVfsFile} from '@site/src/lib/desktop/fileTransfer';
import styles from './viewer.module.css';

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 8];

function initialPath(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const p = new URLSearchParams(window.location.search).get('path');
  return p ? vfs.normalizePath(p) : null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type Load =
  | {state: 'loading'}
  | {state: 'error'; reason: 'missing' | 'unsupported' | 'broken'}
  | {state: 'ready'; url: string; kind: MediaKind; size: number};

function ViewerApp(): ReactNode {
  const [path] = useState<string | null>(initialPath);
  const [load, setLoad] = useState<Load>({state: 'loading'});
  // 画像の表示倍率。null は「ウィンドウに合わせる」
  const [zoom, setZoom] = useState<number | null>(null);
  const [naturalSize, setNaturalSize] = useState<{w: number; h: number} | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const run = async () => {
      vfs.ensureSeeded();
      if (!path) {
        setLoad({state: 'error', reason: 'missing'});
        return;
      }
      const node = vfs.stat(path);
      if (!node || node.type !== 'file') {
        setLoad({state: 'error', reason: 'missing'});
        return;
      }
      const name = vfs.basename(path);
      const kind = mediaKindOf(name);
      if (kind === 'text') {
        setLoad({state: 'error', reason: 'unsupported'});
        return;
      }
      const mime = node.mime || mimeTypeOf(name);
      // バイナリは IndexedDB から、テキストとして取り込まれた SVG などは
      // ノードの中身からその場で Blob を作る。
      const blob =
        vfs.isBinaryFile(node) && node.blobId
          ? await getBlob(node.blobId)
          : new Blob([node.content ?? ''], {type: mime});
      if (cancelled) {
        return;
      }
      if (!blob) {
        setLoad({state: 'error', reason: 'broken'});
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setLoad({state: 'ready', url: objectUrl, kind, size: node.size ?? blob.size});
    };

    void run();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  const zoomBy = (dir: 1 | -1) => {
    setZoom((prev) => {
      const current = prev ?? 1;
      if (dir === 1) {
        return ZOOM_STEPS.find((z) => z > current + 0.001) ?? current;
      }
      return [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001) ?? current;
    });
  };

  const name = path ? vfs.basename(path) : '';

  if (load.state === 'loading') {
    return <div className={styles.app} />;
  }

  if (load.state === 'error') {
    return (
      <div className={styles.app}>
        <div className={styles.notice}>
          {load.reason === 'missing' ? (
            <Translate id="viewer.notFound" values={{name}}>
              {'「{name}」が見つかりません。'}
            </Translate>
          ) : load.reason === 'unsupported' ? (
            <Translate id="viewer.unsupported">
              この形式のファイルはビューアで表示できません。
            </Translate>
          ) : (
            <Translate id="viewer.broken">
              ファイルの実体が見つかりません。取り込み直してください。
            </Translate>
          )}
        </div>
      </div>
    );
  }

  const isImage = load.kind === 'image';

  return (
    <div className={styles.app}>
      <div className={styles.toolbar}>
        <span className={styles.fileName} title={name}>
          {name}
        </span>
        <span className={styles.meta}>
          {formatBytes(load.size)}
          {naturalSize && ` ・ ${naturalSize.w} × ${naturalSize.h}`}
        </span>
        <div className={styles.spacer} />
        {isImage && (
          <>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => zoomBy(-1)}
              aria-label={translate({id: 'viewer.zoomOut', message: '縮小'})}
            >
              −
            </button>
            <span className={styles.zoomLabel}>
              {zoom === null ? (
                <Translate id="viewer.fit">全体表示</Translate>
              ) : (
                `${Math.round(zoom * 100)}%`
              )}
            </span>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => zoomBy(1)}
              aria-label={translate({id: 'viewer.zoomIn', message: '拡大'})}
            >
              ＋
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => setZoom((prev) => (prev === null ? 1 : null))}
            >
              {zoom === null ? (
                <Translate id="viewer.actualSize">実際のサイズ</Translate>
              ) : (
                <Translate id="viewer.fit">全体表示</Translate>
              )}
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => path && void downloadVfsFile(path)}
        >
          <Translate id="files.download">ダウンロード</Translate>
        </button>
      </div>

      <div className={zoom === null ? styles.stage : `${styles.stage} ${styles.stageScroll}`}>
        {load.kind === 'image' && (
          <img
            className={zoom === null ? styles.imageFit : styles.imageZoom}
            style={zoom === null || !naturalSize ? undefined : {width: naturalSize.w * zoom}}
            src={load.url}
            alt={name}
            onLoad={(e) =>
              setNaturalSize({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
          />
        )}
        {load.kind === 'video' && (
          <video className={styles.video} src={load.url} controls playsInline />
        )}
        {load.kind === 'audio' && (
          <div className={styles.audioBox}>
            <span className={styles.audioName}>{name}</span>
            <audio className={styles.audio} src={load.url} controls />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewerPage(): ReactNode {
  return (
    <Layout
      noFooter
      title={translate({id: 'miniApps.viewer.title', message: 'ビューア'})}
      description={translate({
        id: 'miniApps.viewer.description',
        message: '画像・動画・音声ファイルを表示する。',
      })}
    >
      <BrowserOnly>{() => <ViewerApp />}</BrowserOnly>
    </Layout>
  );
}
