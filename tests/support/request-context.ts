/**
 * Stands in for the Next.js request scope in integration tests: a cookie jar
 * and request headers that the mocked `next/headers` module reads from.
 */
const cookieJar = new Map<string, string>();
let requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.10" });

export const requestContext = {
  cookies() {
    return {
      get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
      has: (name: string) => cookieJar.has(name),
      set: (name: string, value: string) => {
        cookieJar.set(name, value);
      },
      delete: (name: string) => {
        cookieJar.delete(name);
      },
    };
  },
  headers() {
    return requestHeaders;
  },
  setCookie(name: string, value: string) {
    cookieJar.set(name, value);
  },
  getCookie(name: string) {
    return cookieJar.get(name);
  },
  setClientAddress(address: string) {
    requestHeaders = new Headers({ "x-forwarded-for": address });
  },
  reset() {
    cookieJar.clear();
    requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.10" });
  },
};

/** What the mocked `redirect()` throws, so tests can assert the destination. */
export class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`Redirected to ${url}`);
  }
}
