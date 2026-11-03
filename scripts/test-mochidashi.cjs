const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const JSZip = require('jszip');
const QRCode = require('qrcode');
if (!globalThis.navigator) globalThis.navigator = {};
if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;
const filename = path.resolve(__dirname, '../src/lib/mochidashi.ts');
const loaded = new Module(filename, module);
loaded.filename = filename; loaded.paths = module.paths;
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
}).outputText, filename);
const {CHUNK, binary, bytes, checksum, packet, parse, manifest, Reception, prepare, verify} = loaded.exports;
const id = crypto.randomUUID();
const payload = crypto.randomBytes(CHUNK * 3 + 17);
const meta = {id, size: payload.length, count: 4, hash: crypto.createHash('sha256').update(payload).digest('hex'), test: false};
const frames = Array.from({length: 4}, (_, i) => payload.subarray(i * CHUNK, (i + 1) * CHUNK).toString('base64'));
assert.equal(checksum('123456789'), 'cbf43926');
assert.equal(bytes(1048576), '1.00 MiB');
assert.equal(binary(payload), payload.toString('binary'));
assert.equal(parse('https://example.com'), null);
assert.deepEqual(manifest(JSON.stringify(meta), id), meta);
assert.throws(() => manifest(JSON.stringify({...meta, count: 3}), id));
assert.throws(() => manifest(JSON.stringify({...meta, size: -1}), id));
const output = [];
const reception = new Reception(meta);
for (let i = 0; i < frames.length; i++) {
  const encoded = packet(id, i, frames[i]);
  const decoded = parse(encoded);
  assert.equal(decoded.index, i);
  output.push(reception.accept(decoded.index, decoded.value));
  assert.equal(reception.accept(decoded.index, decoded.value), null);
  assert.throws(() => parse(encoded.slice(0, -1) + (encoded.endsWith('a') ? 'b' : 'a')));
}
reception.finish();
assert.deepEqual(Buffer.concat(output), payload);
const missing = new Reception(meta);
missing.accept(0, frames[0]);
missing.accept(2, frames[2]);
assert.equal(missing.missing, 2);
assert.equal(missing.accept(2, frames[2]), null);
missing.accept(3, frames[3]); missing.accept(1, frames[1]);
missing.finish(); assert.equal(missing.missing, 0);
const truncated = new Reception(meta);
truncated.accept(0, frames[0]); assert.throws(() => truncated.finish(), /integrity/);
assert.throws(() => new Reception(meta).accept(0, 'YQ=='), /length/);
assert.throws(() => new Reception(meta).accept(4, frames[0]), /index/);
const test = new Reception({...meta, test: true});
test.accept(1, frames[1]); test.accept(2, frames[2]); test.finish();
assert.equal(test.missing, 2); assert.equal(test.received, 2);
// Exercise ZIP streaming/backpressure and cleanup with an in-memory OPFS stand-in.
const entries = new Map();
Object.defineProperty(navigator, 'storage', {value: {getDirectory: async () => ({
  getFileHandle: async name => {
    const pieces = []; entries.set(name, pieces);
    return {createWritable: async () => ({
      write: async data => {await new Promise(resolve => setTimeout(resolve, 1)); pieces.push(Buffer.from(data));},
      close: async () => {}, abort: async () => {},
    }), getFile: async () => new Blob(pieces)};
  }, removeEntry: async name => {entries.delete(name);},
})}});
(async () => {
  // Simulate missing the first and a middle packet, then filling holes on replay.
  const replay = new Reception(meta);
  const disk = Buffer.alloc(payload.length);
  for (const i of [2, 3, 2, 0, 1, 3]) {
    const chunk = replay.accept(i, frames[i]);
    if (chunk) disk.set(chunk, i * CHUNK);
  }
  replay.finish(); assert.equal(replay.received, 4);
  assert.deepEqual(disk, payload);
  await verify(new Blob([disk]), meta.hash);
  await assert.rejects(() => verify(new Blob([disk]), '0'.repeat(64)), /integrity/);
  await assert.rejects(() => verify(new Blob([disk]), meta.hash, () => true), /cancelled/);
  const emptyTest = new Reception({...meta, test: true});
  emptyTest.finish(); assert.equal(emptyTest.missing, meta.count);
  assert.throws(() => manifest(JSON.stringify({...meta, size: 0xffffffff, count: Math.ceil(0xffffffff / CHUNK)}), id));
  const files = [Buffer.from('first file'), Buffer.from('second file')];
  files.forEach(file => {file.name = 'same.txt'; file.size = file.length;});
  const prepared = await prepare(files, false, () => {});
  const data = Buffer.from(await prepared.file.arrayBuffer());
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'), prepared.meta.hash);
  const zip = await JSZip.loadAsync(data, {checkCRC32: true});
  assert.equal(await zip.file('1/same.txt').async('string'), 'first file');
  assert.equal(await zip.file('2/same.txt').async('string'), 'second file');
  assert.ok(QRCode.create(packet(id, -1, JSON.stringify(meta)), {errorCorrectionLevel: 'M'}).modules.size <= 177);
  assert.ok(QRCode.create(packet(id, Number.MAX_SAFE_INTEGER, frames[0]), {errorCorrectionLevel: 'M'}).modules.size <= 177);
  const version = QRCode.create(packet(id, meta.count - 1, 'a'.repeat(512)), {errorCorrectionLevel: 'M'}).version;
  assert.ok(version < 40);
  frames.forEach((f, i) => assert.doesNotThrow(() => QRCode.create(packet(id, i, f), {version, errorCorrectionLevel: 'M'})));
  await prepared.remove(); assert.equal(entries.size, 0);
  await assert.rejects(() => prepare(files, false, () => {}, () => true), /cancelled/);
  assert.equal(entries.size, 0);
  await assert.rejects(() => prepare([{size: 0xffffffff, name: 'huge'}], false, () => {}), /zip64/);
  assert.equal(entries.size, 0);
  const trial = await prepare([], true, () => {});
  assert.equal(trial.meta.count, 60);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await trial.file.arrayBuffer())).digest('hex'), trial.meta.hash);
  await trial.remove(); assert.equal(entries.size, 0);
  for (const locale of ['ja', 'en', 'zh-TW']) {
    const messages = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../i18n/${locale}/code.json`)));
    const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/mochidashi.tsx'), 'utf8');
    for (const match of source.matchAll(/id: '(mochidashi\.[^']+)'/g)) assert.ok(messages[match[1]]?.message, `${locale}: ${match[1]}`);
    assert.ok(messages['miniApps.mochidashi.description']?.message);
  }
  console.log('Mochidashi: CRC, packet corruption, ordering, gaps, duplicates, SHA-256, ZIP round trip, cancellation, limits, cleanup, test mode and locale keys passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
