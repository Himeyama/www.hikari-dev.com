// Exhaustive round trips over the learning app's deliberately small domain.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/rsa-learning.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = module.paths;
loaded._compile(compiled, filename);
const {PRIMES, gcd, inverse, powerSteps, learningPem} = loaded.exports;
let count = 0;
for (const [i, p] of PRIMES.entries()) for (const q of PRIMES.slice(i + 1)) {
  const n = p * q;
  const phi = (p - 1) * (q - 1);
  for (let e = 2; e < phi; e++) {
    if (gcd(e, phi) !== 1) continue;
    const d = inverse(e, phi);
    assert.equal(e * d % phi, 1);
    for (let m = 0; m < n; m++) {
      const {result: c, squares} = powerSteps(m, e, n);
      assert.equal(c, Number(BigInt(m) ** BigInt(e) % BigInt(n)));
      assert.equal(squares.filter((s) => s.selected).reduce((v, s) => v + s.power, 0), e);
      assert.equal(powerSteps(c, d, n).result, m);
      count++;
    }
    const pem = learningPem(p, q, e, d);
    const priv = crypto.createPrivateKey(pem.privateKey);
    const pub = crypto.createPublicKey(pem.publicKey);
    assert.equal(priv.asymmetricKeyType, 'rsa');
    assert.equal(pub.asymmetricKeyType, 'rsa');
    assert.deepEqual(crypto.createPublicKey(priv).export({type: 'spki', format: 'der'}), pub.export({type: 'spki', format: 'der'}));
    const jwk = priv.export({format: 'jwk'});
    const integer = (value) => parseInt(Buffer.from(value, 'base64url').toString('hex'), 16);
    assert.equal(integer(jwk.n), n);
    assert.equal(integer(jwk.e), e);
    assert.equal(integer(jwk.d), d);
    assert.equal(integer(jwk.qi) * q % p, 1);
  }
}
assert.equal(powerSteps(7, 3, 55).result, 13);
assert.equal(powerSteps(13, 27, 55).result, 7);
console.log(`RSA: ${count} round trips and all PEM key pairs passed.`);
