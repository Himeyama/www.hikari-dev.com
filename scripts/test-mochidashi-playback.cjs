const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const source = ts.createSourceFile('mochidashi.tsx', fs.readFileSync('src/pages/mochidashi.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function action(name) {
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(expression, name);
  return ts.transpileModule(`(${expression.getText(source)})`, {compilerOptions: {target: ts.ScriptTarget.ES2022}}).outputText;
}

(async () => {
  const filename = path.resolve('src/lib/mochidashi.ts');
  const core = new Module(filename, module);
  core.filename = filename; core.paths = module.paths;
  core._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.NodeNext, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
  }).outputText, filename);
  const {CHUNK, packet, parse, manifest, Reception, RaptorReception} = core.exports;
  for (const test of [false, true]) {
    const generation = {current: 0};
    const meta = {id: 'trial', size: 1536, count: 4, test};
    const guides = [];
    const running = [];
    const counts = [];
    let passes = 0;
    let firstFrames = 0;
    let clock = 0;
    const context = {
      drawImage() {}, clearRect() {}, putImageData() {},
      createImageData: (width, height) => ({data: new Uint8ClampedArray(width * height * 4)}),
    };
    const environment = {
      source: {current: {meta}}, generation,
      frames: {current: {modules: 1, file: {slice: offset => {
        if (!offset) firstFrames++;
        return {arrayBuffer: async () => new Uint8Array([3]).buffer};
      }}}},
      canvas: {current: {getContext: () => context}},
      document: {createElement: () => ({getContext: () => context})},
      performance: {now: () => ++clock},
      setTimeout: callback => queueMicrotask(callback), fps: 20,
      Uint8Array, Uint8ClampedArray,
      transportCount: m => m.count,
      packet: (_id, index) => index,
      drawGuide: async value => guides.push(value),
      l: {sending: 'sending', repeating: 'repeating', testing: 'testing', error: 'error'},
      setRunning: value => running.push(value), setStatus: value => assert.notEqual(value, 'error'),
      setCount: value => counts.push(value), setElapsed() {},
      setTransferred: value => {
        if (value === meta.size && ++passes === 3) generation.current++; // Explicit cancellation.
      },
    };
    await vm.runInNewContext(action('send'), environment)();
    assert.equal(passes, 3, `${test ? 'test' : 'file'}: keeps sending after 100%`);
    assert.equal(firstFrames, 3);
    assert.deepEqual(running, [true], '100% does not stop transmission');
    assert.equal(counts.filter(value => value === 0).length, 4, 'reset progress for each pass');
    assert.deepEqual(guides, test ? [-2, -1, -2, -1] : [], 'test passes have end and restart guides');
  }
  const environment = {
    m: {test: true}, generation: {current: 4}, token: 4, testFinished: false,
    state: {finish() {}, missing: 2}, l: {testing: 'testing'},
    setLost() {}, setStatus: value => assert.equal(value, 'testing'),
    cameraOff: () => assert.fail('test results must keep the camera open'),
    setRunning: () => assert.fail('test results must keep scanning'),
  };
  await vm.runInNewContext(action('finish'), environment)();
  assert.equal(environment.testFinished, true);
  assert.equal(environment.generation.current, 4);
  // Drive the actual camera scan loop across two passes and a repeated guide.
  const meta = {id: '12345678-1234-1234-1234-123456789abc', size: CHUNK * 4, count: 4, test: true, codec: 'raw-v1', hash: '0'.repeat(64)};
  const guide = packet(meta.id, -1, JSON.stringify(meta));
  const end = packet(meta.id, -2, '');
  const data = Array.from({length: 4}, (_, index) => packet(meta.id, index, Buffer.alloc(CHUNK, index).toString('base64')));
  let batch = [guide, data[0], data[2], end];
  const timers = [];
  const received = [];
  const progress = [];
  const statuses = [];
  const live = [];
  let stopped = 0;
  let clock = 0;
  const generation = {current: 0};
  class Detector {
    static async getSupportedFormats() {return ['qr_code'];}
    async detect() {return batch.map(rawValue => ({rawValue}));}
  }
  const scanEnvironment = {
    ...core.exports, generation, stop: () => generation.current++,
    window: {BarcodeDetector: Detector},
    navigator: {storage: {getDirectory() {}}, mediaDevices: {getUserMedia: async () => ({getTracks: () => []})}},
    stream: {current: null}, download: {current: ''}, receiver: {current: null}, recovery: {current: null},
    video: {current: {videoWidth: 1920, videoHeight: 1080, readyState: 4, play: async () => {}}},
    document: {createElement: () => ({getContext: () => ({drawImage() {}})})},
    performance: {now: () => ++clock}, timer: {current: null},
    setTimeout: callback => {timers.push(callback); return timers.length;},
    l: new Proxy({}, {get: (_target, key) => key}),
    setRunning: value => live.push(value), setStatus: value => statuses.push(value),
    setCount: value => received.push(value), setTransferred: value => progress.push(value),
    setUrl() {}, setLost() {}, setMeta() {}, setElapsed() {},
    cameraOff: () => stopped++, releaseReceiver: async () => {},
  };
  const scanDone = async () => {
    for (let attempts = 0; !timers.length && attempts < 20; attempts++) await new Promise(resolve => setImmediate(resolve));
    assert.ok(timers.length, `camera scan remains active: ${statuses}`);
  };
  await vm.runInNewContext(action('receive'), scanEnvironment)();
  await scanDone();
  assert.equal(progress.at(-1), CHUNK * 2);
  assert.equal(received.at(-1), 2);
  batch = [guide]; timers.shift()(); await scanDone();
  assert.equal(progress.at(-1), CHUNK * 2, 'next guide must preserve 50% progress');
  assert.equal(received.at(-1), 2, 'next guide must preserve received frame IDs');
  batch = [data[1], data[3], end]; timers.shift()(); await scanDone();
  assert.equal(progress.at(-1), meta.size, 'second pass fills only the missing frames');
  assert.equal(received.at(-1), 4);
  batch = [guide, ...data]; timers.shift()(); await scanDone();
  assert.equal(progress.at(-1), meta.size, 'later passes preserve 100% and ignore duplicates');
  assert.equal(received.at(-1), 4);
  assert.equal(stopped, 0); assert.deepEqual(live, [true]);
  generation.current++; timers.shift()();
  console.log('Mochidashi playback: repeating send, cancellation, cumulative test reception, missing-frame recovery and duplicate suppression passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
