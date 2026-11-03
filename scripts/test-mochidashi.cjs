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
  compilerOptions: {module: ts.ModuleKind.NodeNext, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
}).outputText, filename);
const {CHUNK, BLOCK_SIZE, RAPTOR_PACKET_SIZE, binary, bytes, checksum, packet, parse, manifest, Reception, RaptorReception, prepare, symbols, transportCount, verify} = loaded.exports;
const id = crypto.randomUUID();
const payload = crypto.randomBytes(CHUNK * 3 + 17);
const meta = {id, size: payload.length, count: 4, hash: crypto.createHash('sha256').update(payload).digest('hex'), test: false, codec: 'raptorq-v1'};
const frames = Array.from({length: 4}, (_, i) => payload.subarray(i * CHUNK, (i + 1) * CHUNK).toString('base64'));
assert.equal(checksum('123456789'), 'cbf43926');
assert.equal(bytes(1048576), '1.00 MiB');
assert.equal(binary(payload), payload.toString('binary'));
assert.equal(parse('https://example.com'), null);
assert.deepEqual(manifest(JSON.stringify(meta), id), meta);
assert.throws(() => manifest(JSON.stringify({...meta, count: 3}), id));
assert.throws(() => manifest(JSON.stringify({...meta, size: -1}), id));
assert.throws(() => manifest(JSON.stringify({...meta, codec: 'unknown'}), id));
assert.throws(() => manifest(JSON.stringify({...meta, test: true}), id));
assert.equal(parse('MDK1|' + id + '|0|ignored'), null);
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
    entries.set(name, Buffer.alloc(0));
    return {createWritable: async (options = {}) => {
      let data = options.keepExistingData ? Buffer.from(entries.get(name)) : Buffer.alloc(0);
      let cursor = 0;
      let closed = false;
      return {
        write: async input => {
          assert.equal(closed, false);
          await new Promise(resolve => setTimeout(resolve, 0));
          const positioned = input.type === 'write';
          const piece = Buffer.from(positioned ? input.data : input);
          const position = positioned ? input.position : cursor;
          if (position + piece.length > data.length) {const larger = Buffer.alloc(position + piece.length); data.copy(larger); data = larger;}
          piece.copy(data, position); cursor = position + piece.length;
        },
        close: async () => {assert.equal(closed, false); closed = true; entries.set(name, data);},
        abort: async () => {closed = true;},
      };
    }, getFile: async () => new Blob([entries.get(name)])};
  }, removeEntry: async name => {entries.delete(name);},
})}});
(async () => {
  // Use the real pinned WASM engine. Browser loading is checked by the site build.
  const codec = await import('@raptorqr/raptorq-wasm');
  codec.initSync({module: fs.readFileSync(require.resolve('@raptorqr/raptorq-wasm/wasm/raptorqr_raptorq_wasm_bg.wasm'))});
  const fecData = crypto.randomBytes(BLOCK_SIZE * 2 + CHUNK * 3 + 17);
  const fecMeta = {...meta, size: fecData.length, count: Math.ceil(fecData.length / CHUNK), hash: crypto.createHash('sha256').update(fecData).digest('hex')};
  const encoded = [];
  for await (const symbol of symbols(new Blob([fecData]), fecMeta)) {
    assert.equal(symbol.data.length, RAPTOR_PACKET_SIZE);
    encoded.push({index: symbol.index, value: Buffer.from(symbol.data).toString('base64')});
  }
  assert.equal(encoded.length, transportCount(fecMeta));
  assert.equal(transportCount({...fecMeta, size: BLOCK_SIZE}), 192);
  // Drop 20% of full generations, including source zero; reverse the rest.
  const fec = await RaptorReception.create(fecMeta);
  const restored = Buffer.alloc(fecData.length);
  for (const p of encoded.filter(p => Math.floor(p.index / 192) < 2 ? (p.index % 192) % 5 !== 0 : p.index % 192 !== 0).reverse()) {
    const result = await fec.accept(p.index, p.value);
    if (result) restored.set(result.data, result.position);
    assert.equal(await fec.accept(p.index, p.value), null);
  }
  fec.finish(); assert.deepEqual(restored, fecData);
  await verify(new Blob([restored]), fecMeta.hash);
  assert.equal(fec.missing, 0);
  await fec.dispose(); assert.equal(entries.size, 0);
  // Incomplete blocks survive decoder eviction and complete using only repair packets on pass two.
  const partial = await RaptorReception.create(fecMeta);
  const resumed = Buffer.alloc(fecData.length);
  const isSource = p => p.index % 192 < Math.ceil(Math.min(BLOCK_SIZE, fecMeta.size - Math.floor(p.index / 192) * BLOCK_SIZE) / CHUNK);
  for (const p of encoded.filter(p => isSource(p) && p.index % 192 !== 0)) assert.equal(await partial.accept(p.index, p.value), null);
  assert.equal(partial.receivedBytes, 0); assert.throws(() => partial.finish(), /integrity/);
  for (const p of encoded.filter(p => !isSource(p))) {
    const result = await partial.accept(p.index, p.value);
    if (result) resumed.set(result.data, result.position);
  }
  partial.finish(); assert.deepEqual(resumed, fecData);
  await partial.dispose(); assert.equal(entries.size, 0);
  const cancelled = await RaptorReception.create(fecMeta);
  const pending = cancelled.accept(encoded[1].index, encoded[1].value);
  await new Promise(resolve => setTimeout(resolve, 0));
  await cancelled.dispose(); await pending;
  assert.equal(await cancelled.accept(encoded[2].index, encoded[2].value), null);
  assert.equal(entries.size, 0);
  const invalid = await RaptorReception.create(fecMeta);
  await assert.rejects(() => invalid.accept(encoded.length, encoded[0].value), /index/);
  await assert.rejects(() => invalid.accept(0, 'YQ=='), /length/);
  const foreign = Buffer.alloc(RAPTOR_PACKET_SIZE); foreign[0] = 1;
  await assert.rejects(() => invalid.accept(0, foreign.toString('base64')), /raptorq block/);
  await invalid.dispose(); assert.equal(entries.size, 0);
  const encoderCancelled = symbols(new Blob([fecData]), fecMeta, () => true);
  await assert.rejects(() => encoderCancelled.next(), /cancelled/);
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
  assert.equal(trial.meta.codec, 'raw-v1');
  let testCount = 0;
  for await (const item of symbols(trial.file, trial.meta)) {assert.equal(item.data.length, CHUNK); testCount++;}
  assert.equal(testCount, 60); assert.equal(transportCount(trial.meta), 60);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await trial.file.arrayBuffer())).digest('hex'), trial.meta.hash);
  await trial.remove(); assert.equal(entries.size, 0);
  for (const locale of ['ja', 'en', 'zh-TW']) {
    const messages = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../i18n/${locale}/code.json`)));
    const source = fs.readFileSync(path.resolve(__dirname, '../src/pages/mochidashi.tsx'), 'utf8');
    for (const match of source.matchAll(/id: '(mochidashi\.[^']+)'/g)) assert.ok(messages[match[1]]?.message, `${locale}: ${match[1]}`);
    assert.ok(messages['miniApps.mochidashi.description']?.message);
  }
  console.log('Mochidashi: real RaptorQ WASM, missing-source recovery, reversed order, duplicates, multi-pass disk recovery, cancellation/cleanup, CRC, SHA-256, ZIP and locales passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
