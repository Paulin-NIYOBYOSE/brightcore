import "server-only";
import { hash, verify, type Algorithm, type Options } from "@node-rs/argon2";

// `Algorithm` is a const enum in the library's typings, which TypeScript cannot
// reference under isolatedModules, so the numeric value is used: 2 = Argon2id.
const ARGON2ID = 2 as Algorithm;

/** Argon2id with OWASP's recommended minimum: 19 MiB memory, 2 passes, 1 lane. */
const ARGON2_OPTIONS: Options = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

/** Returns a PHC string such as `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`. */
export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** Constant-time comparison handled by the library. Malformed hashes count as a mismatch. */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
