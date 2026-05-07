import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

export function hashPassword(plainText: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(plainText, salt, KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64"),
    derivedKey.toString("base64"),
  ].join("$");
}

export function verifyPassword(plainText: string, encodedHash: string): boolean {
  const [algo, nStr, rStr, pStr, saltB64, keyB64] = encodedHash.split("$");
  if (!algo || !nStr || !rStr || !pStr || !saltB64 || !keyB64) return false;
  if (algo !== "scrypt") return false;

  const salt = Buffer.from(saltB64, "base64");
  const key = Buffer.from(keyB64, "base64");
  const derived = scryptSync(plainText, salt, key.length, {
    N: Number(nStr),
    r: Number(rStr),
    p: Number(pStr),
  });

  if (derived.length !== key.length) return false;
  return timingSafeEqual(derived, key);
}
