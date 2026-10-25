import forge from 'node-forge';

export const PRIMES = [3, 5, 7, 11, 13, 17, 19] as const;

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function inverse(a: number, modulus: number): number {
  for (let d = 1; d < modulus; d++) if ((a * d) % modulus === 1) return d;
  throw new Error('No modular inverse');
}

export function powerSteps(base: number, exponent: number, modulus: number) {
  let result = 1;
  let factor = base;
  let remaining = exponent;
  let power = 1;
  const squares: {power: number; value: number; selected: boolean}[] = [];
  while (remaining > 0) {
    const selected = remaining % 2 === 1;
    squares.push({power, value: factor, selected});
    if (selected) result = (result * factor) % modulus;
    factor = (factor * factor) % modulus;
    remaining = Math.floor(remaining / 2);
    power *= 2;
  }
  return {result, squares};
}

export function learningPem(p: number, q: number, e: number, d: number) {
  const big = (value: number) => new forge.jsbn.BigInteger(String(value), 10);
  const publicKey = forge.pki.rsa.setPublicKey(big(p * q), big(e));
  const privateKey = forge.pki.rsa.setPrivateKey(
    big(p * q), big(e), big(d), big(p), big(q),
    big(d % (p - 1)), big(d % (q - 1)), big(inverse(q, p)),
  );
  return {
    publicKey: forge.pki.publicKeyToPem(publicKey),
    privateKey: forge.pki.privateKeyInfoToPem(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(privateKey))),
  };
}
