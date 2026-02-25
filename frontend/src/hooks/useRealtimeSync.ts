import { useEffect, useRef, useCallback, useState } from "react";

type SyncStatus = "connected" | "connecting" | "disconnected";

interface UseRealtimeSyncOptions {
  /** URL for SSE endpoint (e.g., "/api/events") */
  url: string;
  /** Handler for incoming messages */
  onMessage: (event: { type: string; data: any }) => void;
  /** Whether to enable the connection */
  enabled?: boolean;
  /** Reconnect delay in ms (default: 3000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 10) */
  maxRetries?: number;
}

/**
 * Real-time data synchronization hook using Server-Sent Events (SSE).
 * Falls back to polling if SSE is not supported.
 *
 * Usage:
 * ```ts
 * const { status, lastEvent } = useRealtimeSync({
 *   url: "/api/events",
 *   onMessage: ({ type, data }) => {
 *     if (type === "expense_updated") refetchExpenses();
 *   },
 * });
 * ```
 */
export function useRealtimeSync({
  url,
  onMessage,
  enabled = true,
  reconnectDelay = 3000,
  maxRetries = 10,
}: UseRealtimeSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    setStatus("connecting");

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus("connected");
      retriesRef.current = 0;
    };

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        setLastEvent(parsed.type || "message");
        onMessageRef.current(parsed);
      } catch {
        // Non-JSON message — treat as plain text
        setLastEvent("message");
        onMessageRef.current({ type: "message", data: e.data });
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStatus("disconnected");

      if (retriesRef.current < maxRetries) {
        retriesRef.current += 1;
        const delay = reconnectDelay * Math.min(retriesRef.current, 5);
        timeoutRef.current = setTimeout(connect, delay);
      }
    };
  }, [url, enabled, reconnectDelay, maxRetries]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setStatus("disconnected");
    retriesRef.current = 0;
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return disconnect;
  }, [enabled, connect, disconnect]);

  return { status, lastEvent, disconnect, reconnect: connect };
}

/**
 * Polling-based sync for backends that don't support SSE.
 * Polls an endpoint at intervals and calls onData when new data arrives.
 */
export function usePollingSync<T>({
  url,
  onData,
  interval = 15000,
  enabled = true,
}: {
  url: string;
  onData: (data: T) => void;
  interval?: number;
  enabled?: boolean;
}) {
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          onDataRef.current(data);
          setLastPoll(new Date());
        }
      } catch {
        // silent — network failure
      }
    }

    poll();
    const id = setInterval(poll, interval);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url, interval, enabled]);

  return { lastPoll };
}
