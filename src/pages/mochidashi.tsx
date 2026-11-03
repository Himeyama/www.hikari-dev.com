import React, {useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {translate} from '@docusaurus/Translate';
import QRCode from 'qrcode';
import {binary, bytes, CHUNK, RAPTOR_PACKET_SIZE, Reception, RaptorReception, manifest, packet, parse, prepare, symbols, temporary, transportCount, verify, type Manifest} from '../lib/mochidashi';
import styles from './mochidashi.module.css';

function labels() {
  return {
    title: translate({id: 'mochidashi.title', message: 'もちだしくん'}),
    intro: translate({id: 'mochidashi.intro', message: '複数ファイルを ZIP に圧縮し、QR コードでパソコンからスマホへ転送する。ファイルはサーバーへ送信されない。'}),
    send: translate({id: 'mochidashi.send', message: '送信 (パソコン)'}),
    receive: translate({id: 'mochidashi.receive', message: '受信 (Android Chrome)'}),
    files: translate({id: 'mochidashi.files', message: 'ファイル選択 (複数可)'}),
    chooseFiles: translate({id: 'mochidashi.chooseFiles', message: 'ファイルの選択'}),
    noFiles: translate({id: 'mochidashi.noFiles', message: 'ファイルが選択されていない'}),
    fileCount: (count: number) => translate({id: 'mochidashi.fileCount', message: '{count} ファイル'}, {count}),
    test: translate({id: 'mochidashi.test', message: 'テストモード (60 フレーム)'}),
    speed: translate({id: 'mochidashi.speed', message: '切り替え速度 (フレーム/秒)'}),
    prepare: translate({id: 'mochidashi.prepare', message: '転送準備'}),
    preparing: translate({id: 'mochidashi.preparing', message: '転送データと QR コードを準備中'}),
    ready: translate({id: 'mochidashi.ready', message: 'スマホで受信を開始し、この案内 QR を読み取る。スマホに待機中と表示されたら、送信開始を押す。'}),
    start: translate({id: 'mochidashi.start', message: '送信開始'}),
    stop: translate({id: 'mochidashi.stop', message: '停止'}),
    camera: translate({id: 'mochidashi.camera', message: 'カメラで受信開始'}),
    waiting: translate({id: 'mochidashi.waiting', message: '案内 QR を確認済み。送信開始待機中。'}),
    scanning: translate({id: 'mochidashi.scanning', message: 'パソコンの案内 QR をカメラに映す。'}),
    sending: translate({id: 'mochidashi.sending', message: '送信中'}),
    receiving: translate({id: 'mochidashi.receiving', message: '受信中'}),
    repeating: translate({id: 'mochidashi.repeating', message: '復元用データを含めて繰り返し送信中。スマホで検証が完了したら停止する。'}),
    symbolCount: translate({id: 'mochidashi.symbolCount', message: '受信 QR 数'}),
    verifying: translate({id: 'mochidashi.verifying', message: '受信完了。ファイルを検証中。'}),
    verified: translate({id: 'mochidashi.verified', message: 'SHA-256 一致。ファイルの検証完了。'}),
    testing: translate({id: 'mochidashi.testing', message: 'テスト 1 周完了。次の周の開始待ち。テストモードではファイルを保存できない。速度を変える場合は停止する。'}),
    missing: translate({id: 'mochidashi.missing', message: '未受信フレーム'}),
    rate: translate({id: 'mochidashi.rate', message: '受信率'}),
    transferSpeed: translate({id: 'mochidashi.transferSpeed', message: '転送速度'}),
    download: translate({id: 'mochidashi.download', message: 'ZIP を保存'}),
    failed: translate({id: 'mochidashi.failed', message: '破損・中断、または 15 秒間読み取れなかったため受信を終了した。パソコン側を停止し、速度を下げて転送準備からやり直す。'}),
    error: translate({id: 'mochidashi.error', message: '処理に失敗した。空き容量とカメラの許可を確認し、HTTPS の Android Chrome で開く。ZIP の合計容量は 4 GiB 未満、ファイル数は 65,534 個以下が必要である。'}),
    unsupported: translate({id: 'mochidashi.unsupported', message: 'この環境は QR 読み取りまたはブラウザ内の一時保存に対応していない。Android Chrome を使用する。'}),
    stopped: translate({id: 'mochidashi.stopped', message: '停止済み。再開する場合は転送準備からやり直す。'}),
    note: translate({id: 'mochidashi.note', message: '最初にテストで速度を調節する。通常転送では RaptorQ の復元用データで読み取り漏れを補う。受信の進捗は復元済みの容量を示す。復元できない区画は次の周回でも受信を続ける。スマホで検証が完了したらパソコン側を停止する。受信中は画面を開いたままにする。15 秒間読み取れない場合は終了する。容量は端末の空き容量に依存する。ZIP 内は同名ファイルの上書きを防ぐため番号別フォルダーになる。'}),
    estimate: translate({id: 'mochidashi.estimate', message: '転送容量 / 復元用データを含む 1 周の推定時間 (分)'}),
  };
}

type Detector = {detect(source: HTMLVideoElement | HTMLCanvasElement): Promise<{rawValue: string}[]>};
type DetectorClass = {new(options: {formats: string[]}): Detector; getSupportedFormats(): Promise<string[]>};

function App() {
  const l = labels();
  const [mode, setMode] = useState<'send' | 'receive'>('send');
  const [files, setFiles] = useState<File[]>([]);
  const [test, setTest] = useState(false);
  const [fps, setFps] = useState(20);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [percent, setPercent] = useState(0);
  const [meta, setMeta] = useState<Manifest | null>(null);
  const [count, setCount] = useState(0);
  const [transferred, setTransferred] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lost, setLost] = useState(0);
  const [url, setUrl] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const generation = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const source = useRef<Awaited<ReturnType<typeof prepare>> | null>(null);
  const frames = useRef<{file: File; modules: number; remove: () => Promise<void>} | null>(null);
  const receiver = useRef<{temp: Awaited<ReturnType<typeof temporary>>; writer: FileSystemWritableFileStream} | null>(null);
  const recovery = useRef<RaptorReception | null>(null);
  const download = useRef('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraOff = () => {stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;};
  const releaseReceiver = async () => {
    const current = receiver.current; receiver.current = null;
    const previous = recovery.current; recovery.current = null;
    await previous?.dispose().catch(() => {});
    if (current) {await current.writer.abort().catch(() => {}); await current.temp.remove();}
  };
  const stop = () => {
    generation.current++; cameraOff();
    if (timer.current) clearTimeout(timer.current);
    void releaseReceiver();
    setRunning(false); setBusy(false); setStatus(l.stopped); setMeta(null);
    const previous = source.current; source.current = null; void previous?.remove();
    const oldFrames = frames.current; frames.current = null; void oldFrames?.remove();
    if (download.current) URL.revokeObjectURL(download.current);
    download.current = ''; setUrl('');
  };
  useEffect(() => () => {
    generation.current++; cameraOff(); void releaseReceiver(); void source.current?.remove(); void frames.current?.remove();
    if (timer.current) clearTimeout(timer.current);
    if (download.current) URL.revokeObjectURL(download.current);
  }, []);
  useEffect(() => {
    const hidden = () => {if (document.hidden && running) stop();};
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [running]);
  const drawGuide = async (value: string, token: number) => {
    const guide = document.createElement('canvas');
    await QRCode.toCanvas(guide, value, {width: 640, margin: 4, errorCorrectionLevel: 'M'});
    if (token !== generation.current || !canvas.current) return;
    const display = canvas.current;
    display.width = 1280; display.height = 1280;
    const context = display.getContext('2d');
    if (!context) throw Error('canvas');
    context.fillStyle = 'white'; context.fillRect(0, 0, 1280, 1280);
    context.drawImage(guide, 640, 0);
  };
  const build = async () => {
    stop(); const token = generation.current;
    setBusy(true); setPercent(0); setCount(0); setTransferred(0); setLost(0); setStatus(l.preparing);
    try {
      const prepared = await prepare(files, test, n => {if (token === generation.current) setPercent(n);}, () => token !== generation.current);
      if (token !== generation.current) {await prepared.remove(); return;}
      source.current = prepared;
      const storage = await temporary();
      const writer = await storage.handle.createWritable();
      try {
        const total = transportCount(prepared.meta);
        const frameCount = Math.ceil(total / 2);
        // Pick one version that fits even the longest full-sized packet.
        const sample = packet(prepared.meta.id, total - 1, 'a'.repeat(Math.ceil((test ? CHUNK : RAPTOR_PACKET_SIZE) / 3) * 4));
        const version = QRCode.create(sample, {errorCorrectionLevel: 'M'}).version;
        const moduleCount = version * 4 + 17;
        const iterator = symbols(prepared.file, prepared.meta, () => token !== generation.current);
        let previous: {index: number; data: Uint8Array} | undefined;
        try {
          for (let frame = 0; frame < frameCount; frame++) {
            if (token !== generation.current) throw Error('cancelled');
            const modules = new Uint8Array(moduleCount * moduleCount);
            for (let channel = 0; channel < 2; channel++) {
              const next = await iterator.next();
              if (!next.done) previous = next.value;
              if (!previous) throw Error('symbols');
              const qr = QRCode.create(packet(prepared.meta.id, previous.index, btoa(binary(previous.data))), {version, errorCorrectionLevel: 'M'});
              for (let j = 0; j < modules.length; j++) if (qr.modules.data[j]) modules[j] |= 1 << channel;
            }
            await writer.write(modules);
            setPercent(Math.round((frame + 1) / frameCount * 100));
          }
        } finally {await iterator.return(undefined);}
        await writer.close();
        if (token !== generation.current) {await storage.remove(); return;}
        frames.current = {...storage, modules: moduleCount, file: await storage.handle.getFile()};
      } catch (error) {await writer.abort().catch(() => {}); await storage.remove(); throw error;}
      setMeta(prepared.meta);
      await drawGuide(packet(prepared.meta.id, -1, JSON.stringify(prepared.meta)), token);
      setStatus(l.ready);
    } catch {if (token === generation.current) setStatus(l.error);}
    finally {if (token === generation.current) setBusy(false);}
  };
  const send = async () => {
    const prepared = source.current;
    if (!prepared) return;
    const token = ++generation.current;
    setRunning(true); setStatus(l.sending); setCount(0); setTransferred(0); setElapsed(0);
    try {
      const frameFile = frames.current?.file;
      if (!frameFile || !canvas.current) throw Error('frames');
      const display = canvas.current;
      const context = display.getContext('2d');
      if (!context) throw Error('canvas');
      const previous = document.createElement('canvas');
      previous.width = 640; previous.height = 1280;
      const previousContext = previous.getContext('2d')!;
      previousContext.drawImage(display, 640, 0, 640, 1280, 0, 0, 640, 1280);
      const square = document.createElement('canvas');
      const moduleCount = frames.current!.modules;
      const side = moduleCount + 8;
      square.width = side; square.height = side;
      const squareContext = square.getContext('2d')!;
      let nextDisplay = 0;
      const total = transportCount(prepared.meta);
      const frameCount = Math.ceil(total / 2);
      while (token === generation.current) {
        setCount(0); setTransferred(0); setElapsed(0);
        setStatus(prepared.meta.test ? l.sending : l.repeating);
        const started = performance.now();
        for (let frame = 0; frame < frameCount; frame++) {
          const modules = new Uint8Array(await frameFile.slice(frame * moduleCount * moduleCount, (frame + 1) * moduleCount * moduleCount).arrayBuffer());
          if (modules.length !== moduleCount * moduleCount) throw Error('frame');
          const delay = nextDisplay - performance.now();
          if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
          if (token !== generation.current) return;
          context.imageSmoothingEnabled = false;
          context.drawImage(previous, 0, 0);
          for (let channel = 0; channel < 2; channel++) {
            const image = squareContext.createImageData(side, side);
            image.data.fill(255);
            for (let y = 0; y < moduleCount; y++) for (let x = 0; x < moduleCount; x++) {
              const dark = modules[y * moduleCount + x] & (1 << channel);
              const offset = ((y + 4) * side + x + 4) * 4;
              image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = dark ? 0 : 255;
            }
            squareContext.putImageData(image, 0, 0);
            context.drawImage(square, 640, channel * 640, 640, 640);
            previousContext.imageSmoothingEnabled = false;
            previousContext.drawImage(square, 0, channel * 640, 640, 640);
          }
          nextDisplay = performance.now() + 1000 / fps;
          const emitted = Math.min((frame + 1) * 2, total);
          setCount(emitted);
          setTransferred(Math.round(prepared.meta.size * emitted / total));
          setElapsed((performance.now() - started) / 1000);
        }
        // Leave the final data frame visible before showing the end marker.
        await new Promise(resolve => setTimeout(resolve, 1000 / fps));
        if (token !== generation.current) return;
        if (prepared.meta.test) {
          await drawGuide(packet(prepared.meta.id, -2, ''), token);
          setStatus(l.testing);
          // Give the receiver time to display this pass's result, then resynchronise.
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (token !== generation.current) return;
          await drawGuide(packet(prepared.meta.id, -1, JSON.stringify(prepared.meta)), token);
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (token !== generation.current) return;
          previousContext.clearRect(0, 0, 640, 1280);
          previousContext.drawImage(display, 640, 0, 640, 1280, 0, 0, 640, 1280);
        }
      }
    } catch {if (token === generation.current) {setRunning(false); setStatus(l.error);}}
  };
  const receive = async () => {
    stop(); const token = generation.current;
    if (download.current) URL.revokeObjectURL(download.current);
    download.current = ''; setUrl(''); setCount(0); setTransferred(0); setLost(0);
    setRunning(true); setStatus(l.scanning); setElapsed(0);
    let started = 0;
    let m: Manifest | null = null;
    let state: Reception | RaptorReception | null = null;
    let testFinished = false;
    let last = performance.now();
    const fail = async () => {
      if (token !== generation.current) return;
      generation.current++; cameraOff(); await releaseReceiver(); setRunning(false); setStatus(l.failed);
    };
    const finish = async () => {
      if (!m || token !== generation.current) return;
      state!.finish(); setLost(state!.missing);
      if (m.test) {
        setStatus(l.testing);
        testFinished = true;
        return;
      } else {
        setStatus(l.verifying);
        await recovery.current?.dispose(); recovery.current = null;
        const storage = receiver.current!;
        await storage.writer.close();
        const file = await storage.temp.handle.getFile();
        await verify(file, m.hash, () => token !== generation.current);
        if (token !== generation.current) {await storage.temp.remove(); return;}
        download.current = URL.createObjectURL(file); setUrl(download.current);
        // Keep the backing file until the download URL is released or the page closes.
        receiver.current = null;
        const oldSource = source.current; void oldSource?.remove();
        source.current = {...storage.temp, file, meta: m};
        setStatus(l.verified);
      }
      generation.current++; cameraOff(); setRunning(false);
    };
    try {
      const Constructor = (window as unknown as {BarcodeDetector?: DetectorClass}).BarcodeDetector;
      if (!Constructor || !navigator.storage?.getDirectory || !(await Constructor.getSupportedFormats()).includes('qr_code')) {
        setStatus(l.unsupported); setRunning(false); return;
      }
      const detector = new Constructor({formats: ['qr_code']});
      const camera = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}, width: {ideal: 1920}, height: {ideal: 1080}}});
      if (token !== generation.current) {camera.getTracks().forEach(t => t.stop()); return;}
      stream.current = camera; video.current!.srcObject = camera; await video.current!.play();
      const snapshot = document.createElement('canvas');
      const crop = document.createElement('canvas');
      const scan = async () => {
        if (token !== generation.current) return;
        try {
          const cameraVideo = video.current!;
          if (!cameraVideo.videoWidth || !cameraVideo.videoHeight || cameraVideo.readyState < 2) {
            timer.current = setTimeout(() => void scan(), 100); return;
          }
          // Detect a frozen frame so all crops belong to the same transmission step.
          snapshot.width = cameraVideo.videoWidth; snapshot.height = cameraVideo.videoHeight;
          const context = snapshot.getContext('2d');
          if (!context) throw Error('canvas');
          context.drawImage(cameraVideo, 0, 0);
          const results = await detector.detect(snapshot);
          // Some native detectors struggle with several dense QR codes in one image.
          // Overlapping crops isolate them without requiring exact camera alignment.
          if (m || !results.length) {
            const width = Math.ceil(snapshot.width * 0.6);
            const height = Math.ceil(snapshot.height * 0.6);
            crop.width = width; crop.height = height;
            const cropContext = crop.getContext('2d');
            if (!cropContext) throw Error('canvas');
            for (const [x, y] of [[0, 0], [snapshot.width - width, 0], [0, snapshot.height - height], [snapshot.width - width, snapshot.height - height]]) {
              if (token !== generation.current) return;
              cropContext.drawImage(snapshot, x, y, width, height, 0, 0, width, height);
              results.push(...await detector.detect(crop));
            }
          }
          const packets = results.flatMap(result => {
            try {const parsed = parse(result.rawValue); return parsed ? [parsed] : [];} catch {return [];}
          }).sort((a, b) => (a.index === -2 ? Infinity : a.index) - (b.index === -2 ? Infinity : b.index));
          for (const p of packets) {
            if (token !== generation.current) return;
            if (!m) {
              if (p.index !== -1) continue;
              m = manifest(p.value, p.id);
              if (m.test) state = new Reception(m);
              else {
                const decoder = await RaptorReception.create(m);
                if (token !== generation.current) {await decoder.dispose(); return;}
                recovery.current = decoder; state = decoder;
              }
              setMeta(m);
              if (!m.test) {
                const temp = await temporary(); const writer = await temp.handle.createWritable();
                if (token !== generation.current) {await writer.abort(); await temp.remove(); return;}
                receiver.current = {temp, writer};
              }
              last = performance.now(); setLost(m.count); setStatus(l.waiting); continue;
            }
            if (p.id !== m.id) continue;
            if (p.index === -1) {
              if (m.test && testFinished) {
                state = new Reception(m); testFinished = false; started = 0;
                setCount(0); setTransferred(0); setElapsed(0); setLost(m.count); setStatus(l.waiting);
              }
              if (state!.received === 0) last = performance.now();
              continue;
            }
            if (p.index === -2) {if (m.test && !testFinished) await finish(); continue;}
            if (testFinished) continue;
            last = performance.now();
            if (!started) started = performance.now();
            if (state instanceof RaptorReception) {
              const block = await state.accept(p.index, p.value);
              if (token !== generation.current) return;
              if (block && receiver.current) await receiver.current.writer.write({type: 'write', position: block.position, data: block.data});
            } else {
              const data = state!.accept(p.index, p.value);
              if (!data) continue;
            }
            setLost(state!.missing);
            if (token !== generation.current) return;
            last = performance.now(); setCount(state!.received); setTransferred(state!.receivedBytes); setStatus(l.receiving);
            setElapsed(state!.received > 1 ? (performance.now() - started) / 1000 : 0);
            if (!m.test && state!.receivedBytes === m.size) {await finish(); return;}
          }
          if (m && performance.now() - last > 15000) {
            if (m.test) {if (!testFinished) await finish(); last = performance.now();}
            else {await fail(); return;}
          }
          if (token === generation.current) timer.current = setTimeout(() => void scan(), 10);
        } catch {setLost(state?.missing ?? 0); await fail();}
      };
      void scan();
    } catch {
      if (token === generation.current) {cameraOff(); await releaseReceiver(); setRunning(false); setStatus(l.error);}
    }
  };
  return <main className={styles.page}>
    <h1>{l.title}</h1><p>{l.intro}</p>
    <div className={styles.actions}>
      <button disabled={busy || running} aria-pressed={mode === 'send'} onClick={() => {stop(); setMode('send');}}>{l.send}</button>
      <button disabled={busy || running} aria-pressed={mode === 'receive'} onClick={() => {stop(); setMode('receive');}}>{l.receive}</button>
    </div>
    {mode === 'send' ? <>
      <div className={styles.fileField}><span>{l.files}</span><div className={styles.fileRow}>
        <input ref={fileInput} className={styles.fileInput} type="file" multiple disabled={busy || running} aria-label={l.files} tabIndex={-1} onChange={e => {stop(); setFiles(Array.from(e.target.files ?? []));}} />
        <button type="button" className={styles.fileButton} disabled={busy || running} onClick={() => fileInput.current?.click()}>{l.chooseFiles}</button>
        <span>{files.length ? l.fileCount(files.length) : l.noFiles}</span>
      </div></div>
      <ul>{files.map((f, i) => <li key={i}>{f.name} ({bytes(f.size)})</li>)}</ul>
      <div className={styles.check}><input id="mochidashi-test" type="checkbox" checked={test} disabled={busy || running} onChange={e => {stop(); setTest(e.target.checked);}} /><label htmlFor="mochidashi-test">{l.test}</label></div>
      <label>{l.speed}: {fps}<input type="range" min="1" max="30" step="1" value={fps} disabled={running} onChange={e => setFps(Number(e.target.value))} /></label>
      <div className={styles.actions}><button onClick={() => void build()} disabled={busy || running || (!test && !files.length)}>{l.prepare}</button>
        <button onClick={() => void send()} disabled={busy || running || !meta}>{l.start}</button>
        <button onClick={stop} disabled={!busy && !running && !meta}>{l.stop}</button></div>
      {busy && <progress max={100} value={percent} />}
      <canvas ref={canvas} className={styles.qr} hidden={!meta} />
      {meta && <p>{l.estimate}: {bytes(meta.size)} / {(Math.ceil(transportCount(meta) / 2) / fps / 60).toFixed(1)}</p>}
    </> : <>
      <div className={styles.actions}><button onClick={() => void receive()} disabled={running}>{l.camera}</button><button onClick={stop} disabled={!running}>{l.stop}</button></div>
      {url && <div className={styles.actions}><button type="button" onClick={() => {const link = document.createElement('a'); link.href = url; link.download = 'mochidashi.zip'; link.click();}}>{l.download}</button></div>}
      <video ref={video} muted playsInline className={styles.video} />
    </>}
    <p role="status" aria-live="polite">{status}</p>
    {meta && <><progress aria-label={mode === 'send' ? l.sending : l.receiving} max={meta.size} value={transferred} />
      <p>{bytes(transferred)} / {bytes(meta.size)} ({(transferred / 1048576).toFixed(2)} MiB) · {(transferred / meta.size * 100).toFixed(1)}%</p>
      {elapsed > 0 && <p>{l.transferSpeed}: {bytes((mode === 'receive' ? Math.max(0, transferred - CHUNK) : transferred) / elapsed)}/s</p>}
      {mode === 'receive' && <p>{l.symbolCount}: {count}</p>}
      {mode === 'receive' && meta.test && <p>{l.missing}: {lost} · {l.rate}: {(count / meta.count * 100).toFixed(1)}%</p>}
      <p className={styles.hash}>SHA-256: <code>{meta.hash}</code></p></>}
    <p className={styles.note}>{l.note}</p>
  </main>;
}

export default function Mochidashi() {
  return <Layout title={translate({id: 'mochidashi.title', message: 'もちだしくん'})}><BrowserOnly>{() => <App />}</BrowserOnly></Layout>;
}
