export async function fetchJson<T>(
  url: string,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const debug = process.env.DEBUG === "1" || process.env.DEBUG?.toLowerCase() === "true";
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: abortController.signal,
      headers: { "user-agent": "langchain-weather-agent/1.0" },
    });
    if (!res.ok) {
      const body = debug ? await res.text().catch(() => "") : "";
      throw new Error(
        `HTTP ${res.status} ${res.statusText} for ${url}${body ? `: ${body.slice(0, 200)}` : ""}`
      );
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
