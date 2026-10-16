// API base URL. Defaults to the local server; override via VITE_API_URL for
// deployed/preview environments (QAWolf runs against whatever URL this points at).
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface AppState {
  counter: number;
  lastAction: string;
}

type Method = "GET" | "POST";

// Thrown by call() when a request fails. Carries the request details and, when
// the server responded, its HTTP status as fields (not only inside the message)
// so the demo-action-failed Track Event can report them.
export class ApiError extends Error {
  readonly method: Method;
  readonly path: string;
  readonly status?: number; // undefined for network/CORS failures (no response)

  constructor(message: string, method: Method, path: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.method = method;
    this.path = path;
    this.status = status;
  }
}

async function call(path: string, method: Method): Promise<AppState> {
  // A network/CORS failure rejects fetch with no response. Keep its message
  // (e.g. "Failed to fetch") so the UI is unchanged, and add the request details.
  const res = await fetch(`${BASE}${path}`, { method }).catch((e: Error) => {
    throw new ApiError(e.message, method, path);
  });
  if (!res.ok) throw new ApiError(`${method} ${path} failed: ${res.status}`, method, path, res.status);
  return res.json() as Promise<AppState>;
}

export const api = {
  getState: () => call("/api/state", "GET"),
  increment: () => call("/api/increment", "POST"),
  decrement: () => call("/api/decrement", "POST"),
  reset: () => call("/api/reset", "POST"),
};
