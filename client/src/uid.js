/**
 * uid.js — Unique ID generator with a non-secure-context fallback.
 *
 * crypto.randomUUID() only exists in a secure context (https, or localhost).
 * The deployed board is served over plain http from an EC2 public IP, where
 * randomUUID is undefined — calling it there threw before the app could even
 * mount. These IDs only need to be unique, not unguessable, so a Math.random
 * fallback is fine.
 */

export function uid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
