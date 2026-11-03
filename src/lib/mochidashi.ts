import JSZip from 'jszip';
import forge from 'node-forge';

export const CHUNK = 768;
export type Manifest = {id: string; size: number; count: number; hash: string; test: boolean};
export function bytes(n: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(Math.max(1, n)) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i ? 2 : 0)} ${units[i]}`;
}
export function binary(data: Uint8Array): string {
  let result = '';
  for (let i = 0; i < data.length; i += 8192) result += String.fromCharCode(...data.subarray(i, i + 8192));
  return result;
}
export function checksum(value: string): string {
  let crc = -1;
  for (let i = 0; i < value.length; i++) {
    crc ^= value.charCodeAt(i);
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ((crc ^ -1) >>> 0).toString(16).padStart(8, '0');
}
export function packet(id: string, index: number, value: string): string {
  const body = `MDK1|${id}|${index}|${value}`;
  return `${body}|${checksum(body)}`;
}
export function parse(value: string): {id: string; index: number; value: string} | null {
  if (!value.startsWith('MDK1|')) return null;
  if (value.length > 2400) throw Error('packet');
  const parts = value.split('|');
  if (parts.length !== 5 || checksum(parts.slice(0, 4).join('|')) !== parts[4] || !/^[a-f0-9-]{36}$/.test(parts[1]) || !/^-?\d+$/.test(parts[2])) throw Error('packet');
  const index = Number(parts[2]);
  if (!Number.isSafeInteger(index) || index < -2) throw Error('packet');
  return {id: parts[1], index, value: parts[3]};
}
export function manifest(value: string, id: string): Manifest {
  const m = JSON.parse(value) as Manifest;
  if (m.id !== id || !Number.isSafeInteger(m.size) || m.size < 1 || !Number.isSafeInteger(m.count) || m.count !== Math.ceil(m.size / CHUNK) || typeof m.test !== 'boolean' || !/^[a-f0-9]{64}$/.test(m.hash)) throw Error('manifest');
  return m;
}
export function digest() { return forge.md.sha256.create(); }
export class Reception {
  next = 0;
  received = 0;
  receivedBytes = 0;
  missing = 0;
  private hash = digest();
  constructor(readonly meta: Manifest) {}
  accept(index: number, value: string): Uint8Array<ArrayBuffer> | null {
    if (index < this.next) return null;
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.meta.count) throw Error('index');
    if (index !== this.next && !this.meta.test) {this.missing += index - this.next; throw Error('missing');}
    const raw = atob(value);
    if (raw.length !== Math.min(CHUNK, this.meta.size - index * CHUNK) || btoa(raw) !== value) throw Error('length');
    this.missing += index - this.next;
    this.next = index + 1;
    this.received++;
    this.receivedBytes += raw.length;
    this.hash.update(raw);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
  finish(): void {
    this.missing += this.meta.count - this.next;
    this.next = this.meta.count;
    if ((!this.meta.test && this.missing) || (!this.missing && this.hash.digest().toHex() !== this.meta.hash)) throw Error('integrity');
  }
}
export async function temporary() {
  const root = await navigator.storage.getDirectory();
  const name = `mochidashi-${crypto.randomUUID()}`;
  const handle = await root.getFileHandle(name, {create: true});
  return {handle, remove: () => root.removeEntry(name).catch(() => {})};
}
export async function prepare(files: File[], test: boolean, progress: (n: number) => void, cancelled: () => boolean = () => false) {
  const temp = await temporary();
  const writer = await temp.handle.createWritable();
  const hash = digest();
  let size = 0;
  try {
    if (test) {
      const data = crypto.getRandomValues(new Uint8Array(CHUNK * 60));
      hash.update(binary(data)); size = data.length;
      await writer.write(data);
    } else {
      // JSZip emits classic ZIP, not ZIP64. Reject instead of silently overflowing.
      if (files.length > 65534 || files.reduce((n, f) => n + f.size + 1024 + f.name.length * 6, 0) >= 0xffffffff) throw Error('zip64');
      const zip = new JSZip();
      files.forEach((file, i) => zip.file(`${i + 1}/${file.name}`, file));
      await new Promise<void>((resolve, reject) => {
        let writing = Promise.resolve();
        const stream = zip.generateInternalStream({type: 'uint8array', compression: 'DEFLATE', compressionOptions: {level: 1}, streamFiles: true});
        stream.on('data', (data: Uint8Array, meta: {percent: number}) => {
          stream.pause();
          if (cancelled()) {reject(Error('cancelled')); return;}
          size += data.length;
          if (size >= 0xffffffff) { reject(Error('zip64')); return; }
          hash.update(binary(data));
          writing = writing.then(() => writer.write(new Uint8Array(data)));
          writing.then(() => {progress(meta.percent); stream.resume();}, reject);
        });
        stream.on('error', reject);
        // The final data event may be followed by end before its async disk write finishes.
        stream.on('end', () => {writing.then(resolve, reject);});
        stream.resume();
      });
    }
    await writer.close();
    return {...temp, file: await temp.handle.getFile(), meta: {id: crypto.randomUUID(), size, count: Math.ceil(size / CHUNK), hash: hash.digest().toHex(), test} satisfies Manifest};
  } catch (error) {
    await writer.abort().catch(() => {}); await temp.remove(); throw error;
  }
}
