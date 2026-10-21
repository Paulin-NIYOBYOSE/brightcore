// Runs once when the server starts, before it handles requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/server/env");
    // Throws with a list of missing or invalid variables, so a misconfigured
    // deployment fails at startup instead of on the first request.
    getEnv();
  }
}
