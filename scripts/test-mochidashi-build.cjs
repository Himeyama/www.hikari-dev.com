// Exercise the emitted browser codec without any separate WASM asset to deploy.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
  for (const locale of ['', 'en', 'zh-TW']) {
    const root = path.resolve('build', locale);
    const folder = path.join(root, 'assets/js');
    const bundle = fs.readdirSync(folder).find(name => name.endsWith('.js') && fs.readFileSync(path.join(folder, name), 'utf8').includes('RaptorQDecoder:'));
    assert.ok(bundle, `${locale || 'ja'}: emitted codec bundle`);
    const prefix = locale ? `/${locale}/` : '/';
    let assetRequests = 0;
    const self = {webpackChunkwebsite: []};
    vm.runInNewContext(fs.readFileSync(path.join(folder, bundle), 'utf8'), {
      self, console, URL, Request, Response, WebAssembly, TextEncoder, TextDecoder,
      Uint8Array, ArrayBuffer, DataView, FinalizationRegistry,
      fetch: async value => {
        const url = new URL(value);
        assert.equal(url.protocol, 'data:', 'WASM must be embedded; a separate production asset previously returned 404');
        assert.match(url.href, /^data:application\/wasm;base64,/);
        assetRequests++;
        return new Response(Buffer.from(url.href.split(',')[1], 'base64'), {headers: {'Content-Type': 'application/wasm'}});
      },
    });
    const modules = Object.assign({}, ...self.webpackChunkwebsite.map(chunk => chunk[1]));
    const cache = new Map();
    const load = id => {
      if (!cache.has(String(id))) {
        const module = {exports: {}};
        cache.set(String(id), module);
        modules[id](module, module.exports, load);
      }
      return cache.get(String(id)).exports;
    };
    load.p = `https://mochidashi.test${prefix}`;
    load.b = load.p;
    load.r = exports => Object.defineProperty(exports, '__esModule', {value: true});
    load.d = (exports, definitions) => {
      for (const [key, get] of Object.entries(definitions)) Object.defineProperty(exports, key, {get});
    };
    const id = Object.keys(modules).find(key => modules[key].toString().includes('RaptorQDecoder:'));
    assert.ok(id);
    const codec = load(id);
    await codec.default();
    assert.equal(assetRequests, 1);
    const data = new TextEncoder().encode('Production bundle RaptorQ round trip. '.repeat(100));
    const packets = codec.encode_packets(data, 388, 50);
    const decoder = new codec.RaptorQDecoder(data.length, 388);
    let output;
    try {
      // Missing the first source symbol must be repaired by the built engine.
      for (const packet of packets.slice(1)) {output = decoder.push(packet); if (output) break;}
      assert.ok(output);
      assert.deepEqual(Buffer.from(output), Buffer.from(data));
    } finally {decoder.free();}
    for (const name of ['README.txt', 'raptorqr-MIT.txt', 'Apache-2.0.txt']) assert.ok(fs.existsSync(path.join(root, 'licenses/mochidashi', name)));
    console.log(`${locale || 'ja'}: embedded RaptorQ WASM, missing-symbol recovery and notices passed.`);
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
