import { useEffect, useState } from "react";
import { ApiError, api, type AppState } from "./api";

type Action = "load" | "increment" | "decrement" | "reset" | "refresh";

// Seam for Pendo. Novus installs the Pendo agent, which provides window.pendo
// at runtime; this fires a Track Event for each action. No-op when the agent
// isn't present (local dev), so the app and Playwright mocks both stay simple.
function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    try {
      window.pendo?.track?.(`demo-${name}`, props);
    } catch (e) {
      // Never let analytics break the app (run() would show it as a failed action).
      console.warn("Pendo track failed", e);
    }
  }
}

// Properties for demo-<action> once the server confirms it. `previous` is the
// state on screen when the action started; `next` is what the server returned.
// The counter is shared by all visitors, so a counter/previousCounter gap other
// than 1 shows changes made by other sessions in the meantime.
function successProps(action: Action, previous: AppState, next: AppState): Record<string, unknown> {
  switch (action) {
    case "load":
      // The state the visitor arrived to ("none" means a fresh server).
      return { counter: next.counter, lastAction: next.lastAction };
    case "increment":
    case "decrement":
      return {
        counter: next.counter,
        previousCounter: previous.counter,
        lastAction: next.lastAction,
      };
    case "reset":
      // What the reset cleared.
      return { previousCounter: previous.counter, previousLastAction: previous.lastAction };
    case "refresh":
      // counterChanged: whether the re-sync brought in changes from other sessions.
      return {
        counter: next.counter,
        previousCounter: previous.counter,
        counterChanged: next.counter !== previous.counter,
        lastAction: next.lastAction,
      };
  }
}

// Properties for demo-action-failed. Request details come from ApiError; there
// is no httpStatus for network/CORS failures, where fetch got no response.
function failureProps(action: Action, e: unknown): Record<string, unknown> {
  const props: Record<string, unknown> = {
    action,
    errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 100),
  };
  if (e instanceof ApiError) {
    props.method = e.method;
    props.path = e.path;
    if (e.status !== undefined) props.httpStatus = e.status;
  }
  return props;
}

// Whether the initial load has been tracked. Module-level (a ref would reset on
// remount) so demo-load fires once per page load, even though React StrictMode
// runs mount effects twice in development.
let loadTracked = false;

export default function App() {
  const [state, setState] = useState<AppState>({ counter: 0, lastAction: "none" });
  const [error, setError] = useState<string | null>(null);

  const run = async (name: Action, fn: () => Promise<AppState>, track = true) => {
    const previous = state; // what was on screen when the action started
    try {
      setError(null);
      const next = await fn();
      setState(next);
      if (track) trackEvent(name, successProps(name, previous, next));
    } catch (e) {
      setError((e as Error).message);
      if (track) trackEvent("action-failed", failureProps(name, e));
    }
  };

  useEffect(() => {
    run("load", api.getState, !loadTracked);
    loadTracked = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <h1>QAWolf Demo</h1>

      <p data-testid="counter-value" style={{ fontSize: "3rem", margin: "1rem 0" }}>
        {state.counter}
      </p>
      <p data-testid="last-action" style={{ color: "#666" }}>
        Last action: {state.lastAction}
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button data-testid="btn-increment" onClick={() => run("increment", api.increment)}>
          Increment
        </button>
        <button data-testid="btn-decrement" onClick={() => run("decrement", api.decrement)}>
          Decrement
        </button>
        <button data-testid="btn-reset" onClick={() => run("reset", api.reset)}>
          Reset
        </button>
        <button data-testid="btn-refresh" onClick={() => run("refresh", api.getState)}>
          Refresh
        </button>
      </div>

      {error && (
        <p data-testid="error" style={{ color: "crimson", marginTop: 16 }}>
          {error}
        </p>
      )}
    </main>
  );
}
