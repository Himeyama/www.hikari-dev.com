const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/rsa-oaep.ts');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText, filename);
const {generateTextKeys, encryptText} = loaded.exports;

async function main() {
  const keys = await generateTextKeys();
  for (const text of ['', 'Hello, RSA!', '日本語と絵文字🔑\n2 行目', 'a'.repeat(190), 'あ'.repeat(63) + 'a']) {
    const result = await encryptText(keys, text);
    assert.equal(result.recovered, text);
    const encrypted = Buffer.from(result.base64, 'base64');
    assert.equal(encrypted.length, 256);
    assert.equal(result.encodedHex.length, 512);
    assert.equal(result.encodedHex.slice(0, 2), '00');
    assert.equal(crypto.privateDecrypt({key: keys.privatePem, oaepHash: 'sha256'}, encrypted).toString('utf8'), text);
    const external = crypto.publicEncrypt({key: keys.publicPem, oaepHash: 'sha256'}, Buffer.from(text));
    const plain = await crypto.webcrypto.subtle.decrypt('RSA-OAEP', keys.keys.privateKey, external);
    assert.equal(Buffer.from(plain).toString('utf8'), text);
    // The substituted integer really is the OAEP encoded block and yields c.
    let a = BigInt(result.m), exponent = 65537n, c = 1n;
    const n = BigInt(keys.numbers.n.toString());
    while (exponent > 0n) {
      if (exponent & 1n) c = c * a % n;
      a = a * a % n;
      exponent >>= 1n;
    }
    assert.equal(c.toString(), result.c);
    assert(BigInt(result.m) < n);
  }
  await assert.rejects(encryptText(keys, 'a'.repeat(191)), /too long/);
  await assert.rejects(encryptText(keys, 'あ'.repeat(64)), /too long/);
  const first = await encryptText(keys, 'same plaintext');
  const second = await encryptText(keys, 'same plaintext');
  assert.notEqual(first.base64, second.base64);
  const tampered = Buffer.from(first.base64, 'base64');
  tampered[12] ^= 1;
  await assert.rejects(crypto.webcrypto.subtle.decrypt('RSA-OAEP', keys.keys.privateKey, tampered));
  const nextKeys = await generateTextKeys();
  await assert.rejects(crypto.webcrypto.subtle.decrypt('RSA-OAEP', nextKeys.keys.privateKey, Buffer.from(first.base64, 'base64')));
  console.log('RSA-OAEP: Unicode, empty text, byte limits, randomized padding, substituted equations, PEM interoperability, and invalid ciphertext checks passed.');
}
main().catch((error) => {console.error(error); process.exitCode = 1;});
