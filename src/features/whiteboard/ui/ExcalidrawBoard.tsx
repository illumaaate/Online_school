"use client";

import clsx from "clsx";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);

type ExcalidrawApi = {
  updateScene: (data: object) => void;
};

type ExcalidrawBoardProps = {
  lessonId?: string;
  callId?: string;
  className?: string;
  canvasHeightClassName?: string;
};

function normalizeBoardState(boardState: unknown): object | null {
  if (!boardState || typeof boardState !== "object") return null;

  const state = boardState as {
    appState?: { collaborators?: unknown } & Record<string, unknown>;
  };

  const appState = state.appState ?? {};
  const collaborators = appState.collaborators;

  let normalizedCollaborators = new Map();
  if (collaborators instanceof Map) {
    normalizedCollaborators = collaborators;
  } else if (Array.isArray(collaborators)) {
    normalizedCollaborators = new Map(collaborators);
  } else if (collaborators && typeof collaborators === "object") {
    normalizedCollaborators = new Map(
      Object.entries(collaborators as Record<string, unknown>),
    );
  }

  return {
    ...state,
    appState: {
      ...appState,
      collaborators: normalizedCollaborators,
    },
  };
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function ExcalidrawBoard({
  lessonId,
  callId,
  className,
  canvasHeightClassName,
}: ExcalidrawBoardProps) {
  const boardEndpoint = useMemo(() => {
    if (callId) return `/api/calls/${callId}/board`;
    if (lessonId) return `/api/lessons/${lessonId}/board`;
    return null;
  }, [callId, lessonId]);

  const [initialData, setInitialData] = useState<object | null>(null);
  const [ready, setReady] = useState(false);

  const apiRef = useRef<ExcalidrawApi | null>(null);
  const lastSyncAtRef = useRef<string | null>(null);
  const lastSavedAtRef = useRef(0);
  const lastLocalWriteAtRef = useRef(0);

  useEffect(() => {
    if (!boardEndpoint) return;

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(boardEndpoint, { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const data = await safeJson<{
          boardState: object | null;
          updatedAt: string | null;
        }>(res);

        if (!data || cancelled) return;

        setInitialData(normalizeBoardState(data.boardState));
        lastSyncAtRef.current = data.updatedAt;
      } catch {
        if (!cancelled) setInitialData(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [boardEndpoint]);

  useEffect(() => {
    if (!boardEndpoint || !ready) return;

    let cancelled = false;

    const interval = setInterval(() => {
      void (async () => {
        try {
          if (Date.now() - lastLocalWriteAtRef.current < 2500) return;

          const res = await fetch(boardEndpoint, { cache: "no-store" });
          if (!res.ok || cancelled) return;

          const payload = await safeJson<{
            boardState: object | null;
            updatedAt: string | null;
          }>(res);

          if (!payload || cancelled) return;

          if (
            !payload.updatedAt ||
            payload.updatedAt === lastSyncAtRef.current ||
            !payload.boardState
          ) {
            return;
          }

          lastSyncAtRef.current = payload.updatedAt;
          const normalizedState = normalizeBoardState(payload.boardState);
          if (!normalizedState) return;

          apiRef.current?.updateScene(normalizedState);
        } catch {
          // polling errors are expected during tab reloads/network hiccups;
          // swallowed intentionally to avoid unhandled promise rejections in browser.
        }
      })();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [boardEndpoint, ready]);

  if (!boardEndpoint) {
    return (
      <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Whiteboard endpoint is not configured: pass `lessonId` or `callId`.
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white",
        canvasHeightClassName ?? "h-[560px]",
        className,
      )}
    >
      <Excalidraw
        initialData={initialData ?? undefined}
        excalidrawAPI={(api) => {
          apiRef.current = api as ExcalidrawApi;
          setReady(true);
        }}
        onChange={(elements, appState, files) => {
          const now = Date.now();
          if (now - lastSavedAtRef.current < 2200) return;
          lastSavedAtRef.current = now;

          const boardState = {
            elements,
            appState: {
              ...appState,
              collaborators: [],
            },
            files,
          };

          void fetch(boardEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ boardState }),
          })
            .then((res) => safeJson<{ updatedAt?: string }>(res))
            .then((payload) => {
              lastLocalWriteAtRef.current = Date.now();
              if (payload?.updatedAt) lastSyncAtRef.current = payload.updatedAt;
            })
            .catch(() => undefined);
        }}
      />
    </div>
  );
}
