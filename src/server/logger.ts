import "server-only";

type LogFields = Record<string, string | number | boolean | null | undefined>;

/**
 * Minimal structured logger. Callers pass identifiers and codes only: never
 * passwords, session tokens, CV contents or full candidate details.
 */
function write(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  if (process.env.NODE_ENV === "test" && level !== "error") return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

function describeError(error: unknown): LogFields {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: typeof code === "string" ? code : undefined,
    };
  }
  return { errorMessage: String(error) };
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, error: unknown, fields?: LogFields) =>
    write("error", event, { ...fields, ...describeError(error) }),
};
