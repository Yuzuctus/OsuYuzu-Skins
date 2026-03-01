/**
 * Authentication utilities - TOTP + password hashing
 * Uses Web Crypto API (PBKDF2) for Workers compatibility
 * Uses otpauth for TOTP (RFC 6238, compatible with Bitwarden)
 */

import { TOTP, Secret } from "otpauth";

// ─── Password Hashing (PBKDF2 via Web Crypto API) ───────

const PBKDF2_ITERATIONS = 310_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [iterStr, saltHex, hashHex] = storedHash.split(":");
  if (!iterStr || !saltHex || !hashHex) {
    return false;
  }

  const iterations = parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations < 10_000) {
    return false;
  }

  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) {
    return false;
  }

  const saltBytes = saltHex.match(/.{2}/g);
  const hashBytes = hashHex.match(/.{2}/g);
  if (!saltBytes || !hashBytes) {
    return false;
  }

  const salt = new Uint8Array(
    saltBytes.map((byte) => parseInt(byte, 16)),
  );

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  const computed = new Uint8Array(derivedBits);
  const expected = new Uint8Array(
    hashBytes.map((byte) => parseInt(byte, 16)),
  );

  return timingSafeEqual(computed, expected);
}

// ─── TOTP (RFC 6238 - Compatible with Bitwarden) ────────

export function generateTOTPSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

export function getTOTPUri(secret: string, username: string): string {
  const totp = new TOTP({
    issuer: "OsuYuzu",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  return totp.toString();
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new TOTP({
    issuer: "OsuYuzu",
    label: "admin",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });

  // Allow 1 period window (30s before/after)
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

// ─── Base32 Encoding ─────────────────────────────────────

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(data: Uint8Array): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
