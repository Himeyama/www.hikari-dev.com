import forge from 'node-forge';

export const OAEP_MAX_BYTES = 190;

function pem(label: string, data: ArrayBuffer): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----`;
}

export async function generateTextKeys() {
  const keys = await crypto.subtle.generateKey({
    name: 'RSA-OAEP', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256',
  }, true, ['encrypt', 'decrypt']);
  const publicPem = pem('PUBLIC KEY', await crypto.subtle.exportKey('spki', keys.publicKey));
  const privatePem = pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', keys.privateKey));
  const numbers = forge.pki.privateKeyFromPem(privatePem);
  return {keys, publicPem, privatePem, numbers};
}

export type TextKeys = Awaited<ReturnType<typeof generateTextKeys>>;

export async function encryptText(keys: TextKeys, text: string) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > OAEP_MAX_BYTES) throw new Error('RSA-OAEP message too long');
  const encrypted = await crypto.subtle.encrypt({name: 'RSA-OAEP'}, keys.keys.publicKey, bytes);
  const decrypted = await crypto.subtle.decrypt({name: 'RSA-OAEP'}, keys.keys.privateKey, encrypted);
  const recovered = new TextDecoder('utf-8', {fatal: true}).decode(decrypted);
  if (recovered !== text) throw new Error('UTF-8 round trip failed');
  // Recover the encoded integer for the lesson only. OAEP validation and text
  // decryption above are performed by Web Crypto, not by this raw operation.
  const binary = String.fromCharCode(...new Uint8Array(encrypted));
  const encoded = keys.numbers.decrypt(binary, 'RAW');
  const c = new forge.jsbn.BigInteger(forge.util.bytesToHex(binary), 16).toString(10);
  const m = new forge.jsbn.BigInteger(forge.util.bytesToHex(encoded), 16).toString(10);
  return {
    text, keys, base64: btoa(binary), c, m,
    encodedHex: forge.util.bytesToHex(encoded),
    plainHex: forge.util.bytesToHex(String.fromCharCode(...bytes)),
    recovered,
  };
}
