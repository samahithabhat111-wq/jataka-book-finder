import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, hexToBytes, randomBytes } from "@noble/hashes/utils.js";

// Same format and parameters as Node's crypto.scrypt defaults ("saltHex:hashHex"), so existing hashes keep working.
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

const enc = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(enc.encode(password), salt, { ...PARAMS, dkLen: KEY_LEN });
  return `${bytesToHex(salt)}:${bytesToHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = hexToBytes(hashHex);
  const actual = await scryptAsync(enc.encode(password), hexToBytes(saltHex), {
    ...PARAMS,
    dkLen: expected.length,
  });
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
