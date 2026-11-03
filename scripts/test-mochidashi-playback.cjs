const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
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
  console.log('Mochidashi playback: file/test modes continue across 100%, reset each pass, stop on cancellation, and keep test reception active.');
})().catch(error => {console.error(error); process.exitCode = 1;});
