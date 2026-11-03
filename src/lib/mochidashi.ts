import JSZip from 'jszip';
import forge from 'node-forge';

export const CHUNK = 384;
const BLOCK_SYMBOLS = 128;
export const BLOCK_SIZE = CHUNK * BLOCK_SYMBOLS;
export const RAPTOR_PACKET_SIZE = CHUNK + 4;
const REPAIR_PERCENT = 50;
const BLOCK_PACKETS = BLOCK_SYMBOLS * 1.5;
export type Manifest = {id: string; size: number; count: number; hash: string; test: boolean; codec: 'raw-v1' | 'raptorq-v1'};
type RaptorModule = typeof import('@raptorqr/raptorq-wasm');
let codecPromise: Promise<RaptorModule> | undefined;
async function raptorQ(): Promise<RaptorModule> {
  if (!codecPromise) codecPromise = import('@raptorqr/raptorq-wasm').then(async codec => {
    await codec.default(); return codec;
  }).catch(error => {codecPromise = undefined; throw error;});
  return codecPromise;
}
function blockLength(meta: Manifest, block: number): number {return Math.min(BLOCK_SIZE, meta.size - block * BLOCK_SIZE);}
function blockPackets(length: number): number {
  const source = Math.ceil(length / CHUNK);
  return source + Math.ceil(source * REPAIR_PERCENT / 100);
}
export function transportCount(meta: Manifest): number {
  if (meta.test) return meta.count;
  const full = Math.floor(meta.size / BLOCK_SIZE);
  return full * BLOCK_PACKETS + (meta.size % BLOCK_SIZE ? blockPackets(meta.size % BLOCK_SIZE) : 0);
}
function decodeBase64(value: string, length: number): Uint8Array<ArrayBuffer> {
  const raw = atob(value);
  if (raw.length !== length || btoa(raw) !== value) throw Error('length');
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
// Each generation fits in memory; file size does not determine codec memory use.
export async function* symbols(file: Blob, meta: Manifest, cancelled: () => boolean = () => false): AsyncGenerator<{index: number; data: Uint8Array}> {
  if (meta.test) {
    for (let index = 0; index < meta.count; index++) {
      if (cancelled()) throw Error('cancelled');
      yield {index, data: new Uint8Array(await file.slice(index * CHUNK, (index + 1) * CHUNK).arrayBuffer())};
    }
    return;
  }
  const codec = await raptorQ();
  for (let block = 0; block * BLOCK_SIZE < meta.size; block++) {
    if (cancelled()) throw Error('cancelled');
    const data = new Uint8Array(await file.slice(block * BLOCK_SIZE, (block + 1) * BLOCK_SIZE).arrayBuffer());
    const packets = codec.encode_packets(data, RAPTOR_PACKET_SIZE, REPAIR_PERCENT) as Uint8Array[];
    if (packets.length !== blockPackets(data.length)) throw Error('raptorq packets');
    // Systematic packets first: clean links need no repair overhead to decode.
    for (let local = 0; local < packets.length; local++) {
      if (cancelled()) throw Error('cancelled');
      yield {index: block * BLOCK_PACKETS + local, data: packets[local]};
    }
  }
}
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
  const body = `MDK2|${id}|${index}|${value}`;
  return `${body}|${checksum(body)}`;
}
export function parse(value: string): {id: string; index: number; value: string} | null {
  if (!value.startsWith('MDK2|')) return null;
  if (value.length > 2400) throw Error('packet');
  const parts = value.split('|');
  if (parts.length !== 5 || checksum(parts.slice(0, 4).join('|')) !== parts[4] || !/^[a-f0-9-]{36}$/.test(parts[1]) || !/^-?\d+$/.test(parts[2])) throw Error('packet');
  const index = Number(parts[2]);
  if (!Number.isSafeInteger(index) || index < -2) throw Error('packet');
  return {id: parts[1], index, value: parts[3]};
}
export function manifest(value: string, id: string): Manifest {
  const m = JSON.parse(value) as Manifest;
  if (m.id !== id || !Number.isSafeInteger(m.size) || m.size < 1 || m.size >= 0xffffffff || !Number.isSafeInteger(m.count) || m.count !== Math.ceil(m.size / CHUNK) || typeof m.test !== 'boolean' || m.codec !== (m.test ? 'raw-v1' : 'raptorq-v1') || !/^[a-f0-9]{64}$/.test(m.hash)) throw Error('manifest');
  return m;
}
export function digest() { return forge.md.sha256.create(); }
export class Reception {
  received = 0;
  receivedBytes = 0;
  private seen: Uint8Array;
  constructor(readonly meta: Manifest) {this.seen = new Uint8Array(Math.ceil(meta.count / 8));}
  get missing(): number {return this.meta.count - this.received;}
  accept(index: number, value: string): Uint8Array<ArrayBuffer> | null {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.meta.count) throw Error('index');
    if (this.seen[index >>> 3] & (1 << (index & 7))) return null;
    const data = decodeBase64(value, Math.min(CHUNK, this.meta.size - index * CHUNK));
    this.seen[index >>> 3] |= 1 << (index & 7);
    this.received++;
    this.receivedBytes += data.length;
    return data;
  }
  finish(): void {
    if (!this.meta.test && this.missing) throw Error('integrity');
  }
}
// Hash the completed file in order, without keeping out-of-order chunks in memory.
export async function verify(file: Blob, expected: string, cancelled: () => boolean = () => false): Promise<void> {
  const hash = digest();
  for (let offset = 0; offset < file.size; offset += 1048576) {
    if (cancelled()) throw Error('cancelled');
    hash.update(binary(new Uint8Array(await file.slice(offset, offset + 1048576).arrayBuffer())));
  }
  if (cancelled()) throw Error('cancelled');
  if (hash.digest().toHex() !== expected) throw Error('integrity');
}
export async function temporary() {
  const root = await navigator.storage.getDirectory();
  const name = `mochidashi-${crypto.randomUUID()}`;
  const handle = await root.getFileHandle(name, {create: true});
  return {handle, remove: () => root.removeEntry(name).catch(() => {})};
}
type PartialBlock = {temp: Awaited<ReturnType<typeof temporary>>; count: number};
/** Only one live decoder. Incomplete generations are spooled to OPFS between passes. */
export class RaptorReception {
  received = 0;
  receivedBytes = 0;
  private seen: Uint8Array;
  private complete: Uint8Array;
  private partial = new Map<number, PartialBlock>();
  private active: {block: number; decoder: InstanceType<RaptorModule['RaptorQDecoder']>; writer: FileSystemWritableFileStream} | null = null;
  private work: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private disposal?: Promise<void>;
  private constructor(readonly meta: Manifest, private codec: RaptorModule) {
    this.seen = new Uint8Array(Math.ceil(transportCount(meta) / 8));
    this.complete = new Uint8Array(Math.ceil(meta.size / BLOCK_SIZE));
  }
  static async create(meta: Manifest): Promise<RaptorReception> {
    if (meta.codec !== 'raptorq-v1' || meta.test) throw Error('codec');
    return new RaptorReception(meta, await raptorQ());
  }
  get missing(): number {return this.meta.count - Math.ceil(this.receivedBytes / CHUNK);}
  finish(): void {if (this.receivedBytes !== this.meta.size) throw Error('integrity');}
  private async closeActive(): Promise<void> {
    const current = this.active; this.active = null;
    if (current) {
      try {await current.writer.close();}
      catch (error) {await current.writer.abort().catch(() => {}); throw error;}
      finally {current.decoder.free();}
    }
  }
  private async activate(block: number): Promise<void> {
    if (this.active?.block === block) return;
    await this.closeActive();
    let stored = this.partial.get(block);
    if (!stored) {
      stored = {temp: await temporary(), count: 0};
      this.partial.set(block, stored);
    }
    const decoder = new this.codec.RaptorQDecoder(blockLength(this.meta, block), RAPTOR_PACKET_SIZE);
    try {
      if (stored.count) {
        const data = new Uint8Array(await (await stored.temp.handle.getFile()).arrayBuffer());
        if (data.length !== stored.count * RAPTOR_PACKET_SIZE) throw Error('spool');
        for (let i = 0; i < stored.count; i++) decoder.push(data.subarray(i * RAPTOR_PACKET_SIZE, (i + 1) * RAPTOR_PACKET_SIZE));
      }
      this.active = {block, decoder, writer: await stored.temp.handle.createWritable({keepExistingData: true})};
    } catch (error) {decoder.free(); throw error;}
  }
  accept(index: number, value: string): Promise<{position: number; data: Uint8Array<ArrayBuffer>} | null> {
    // Disposal waits for pending storage writes, including a camera scan already in flight.
    const result = this.work.then(async () => {
      if (this.disposed) return null;
      if (!Number.isSafeInteger(index) || index < 0 || index >= transportCount(this.meta)) throw Error('index');
      const block = Math.floor(index / BLOCK_PACKETS);
      if (this.complete[block] || (this.seen[index >>> 3] & (1 << (index & 7)))) return null;
      const data = decodeBase64(value, RAPTOR_PACKET_SIZE);
      // Each generation has exactly one RaptorQ source block. Reject foreign block IDs.
      if (data[0] !== 0) throw Error('raptorq block');
      await this.activate(block);
      const stored = this.partial.get(block)!;
      const decoded = this.active!.decoder.push(data) as Uint8Array | undefined;
      if (decoded && decoded.length !== blockLength(this.meta, block)) throw Error('raptorq length');
      if (!decoded) {
        await this.active!.writer.write({type: 'write', position: stored.count * RAPTOR_PACKET_SIZE, data});
        stored.count++;
      }
      this.seen[index >>> 3] |= 1 << (index & 7);
      this.received++;
      if (!decoded) return null;
      const output = new Uint8Array(decoded);
      await this.closeActive();
      await stored.temp.remove(); this.partial.delete(block);
      this.complete[block] = 1; this.receivedBytes += output.length;
      return {position: block * BLOCK_SIZE, data: output};
    });
    this.work = result.catch(() => {});
    return result;
  }
  dispose(): Promise<void> {
    this.disposed = true;
    if (!this.disposal) this.disposal = (async () => {
      await this.work;
      try {await this.closeActive();}
      finally {
        await Promise.all([...this.partial.values()].map(item => item.temp.remove()));
        this.partial.clear();
      }
    })();
    return this.disposal;
  }
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
    return {...temp, file: await temp.handle.getFile(), meta: {id: crypto.randomUUID(), size, count: Math.ceil(size / CHUNK), hash: hash.digest().toHex(), test, codec: test ? 'raw-v1' : 'raptorq-v1'} satisfies Manifest};
  } catch (error) {
    await writer.abort().catch(() => {}); await temp.remove(); throw error;
  }
}
