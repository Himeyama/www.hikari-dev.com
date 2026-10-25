import {useEffect, useRef, useState, type ReactNode} from 'react';
import {translate} from '@docusaurus/Translate';
import {AppWindow} from './AppWindow';
import {getAppById} from './apps';
import type {SnapKind} from './DesktopShell';
import styles from '../../pages/prompt.module.css';

type WindowState = {id: number; appId: string; rect: {x: number; y: number; w: number; h: number}; z: number; minimized: boolean; snap: SnapKind};

export default function PromptWorkspace(): ReactNode {
  const stage = useRef<HTMLDivElement>(null);
  const sequence = useRef(1);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [focused, setFocused] = useState(0);
  const [dragging, setDragging] = useState(false);
  const open = (appId: string) => {
    if (!getAppById(appId) || !stage.current) return;
    const id = sequence.current++;
    const {clientWidth: w, clientHeight: h} = stage.current;
    const offset = 12 + ((id - 1) % 5) * 22;
    setWindows((current: WindowState[]) => [...current, {id, appId, rect: {x: Math.min(offset, Math.max(0, w - 260)), y: offset, w: Math.max(240, Math.min(1060, w - 32)), h: Math.max(160, h - 70)}, z: id, minimized: false, snap: 'none'}]);
    setFocused(id);
  };
  useEffect(() => {
    open('prompt');
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.source !== 'hikari-desktop' || event.data?.type !== 'open-app') return;
      if (![...(stage.current?.querySelectorAll('iframe') ?? [])].some(frame => frame.contentWindow === event.source)) return;
      open(event.data.appId);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  const update = (id: number, patch: Partial<WindowState>) => setWindows((current: WindowState[]) => current.map(w => w.id === id ? {...w, ...patch} : w));
  const focus = (id: number) => {setFocused(id); update(id, {z: sequence.current++});};
  return <div ref={stage} className={`mini-app-98 ${styles.workspace}`}>
    {windows.map((w: WindowState) => {
      const app = getAppById(w.appId)!;
      const title = translate({id: app.titleId, message: app.titleMessage});
      return <AppWindow key={w.id} href={app.href} title={title} titlePlain={title} rect={w.rect} z={w.z} snap={w.snap}
        focused={focused === w.id} minimized={w.minimized} dragPassthrough={dragging}
        onFocus={() => focus(w.id)} onClose={() => setWindows((current: WindowState[]) => current.filter(item => item.id !== w.id))}
        onMinimize={() => update(w.id, {minimized: true})}
        onToggleMaximize={() => update(w.id, {snap: w.snap === 'max' ? 'none' : 'max'})}
        onMove={(x, y) => update(w.id, {snap: 'none', rect: {...w.rect, x: Math.max(0, Math.min(x, (stage.current?.clientWidth ?? 1024) - 80)), y: Math.max(0, Math.min(y, (stage.current?.clientHeight ?? 768) - 56))}})}
        onResize={rect => update(w.id, {rect})} onSnapPreview={() => {}} onSnapCommit={snap => update(w.id, {snap})} onDragState={setDragging} />;
    })}
    <div className={styles.taskbar}>
      <button type="button" onClick={() => open('prompt')}>{translate({id: 'prompt.title', message: 'プロンプト'})}</button>
      {windows.map((w: WindowState) => <button key={w.id} type="button" aria-pressed={!w.minimized && focused === w.id} onClick={() => {update(w.id, {minimized: false}); focus(w.id);}}>{translate({id: getAppById(w.appId)!.titleId, message: getAppById(w.appId)!.titleMessage})}</button>)}
    </div>
  </div>;
}
