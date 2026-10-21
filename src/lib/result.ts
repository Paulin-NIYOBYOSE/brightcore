import type { FieldErrors } from "@/lib/validation/common";

/**
 * Outcome of a service call or server action. Failures carry a stable `code`
 * for logic and tests, plus a `message` that is always safe to show users.
 */
export type Failure<Code extends string = string> = {
  ok: false;
  code: Code;
  message: string;
  fieldErrors?: FieldErrors;
};

export type Result<Data extends object, Code extends string> = ({ ok: true } & Data) | Failure<Code>;

export function failure<Code extends string>(
  code: Code,
  message: string,
  fieldErrors?: FieldErrors,
): Failure<Code> {
  return fieldErrors ? { ok: false, code, message, fieldErrors } : { ok: false, code, message };
}

export const UNAUTHORIZED = failure(
  "UNAUTHORIZED",
  "Your session has ended. Please sign in again.",
);

export const UNEXPECTED_ERROR = failure(
  "SERVER_ERROR",
  "Something went wrong on our side. Please try again in a moment.",
);
