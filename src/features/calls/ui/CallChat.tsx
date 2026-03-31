"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string };
};

export function CallChat({ callId }: { callId: string }) {
  const [items, setItems] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [networkError, setNetworkError] = useState("");
  const [sending, setSending] = useState(false);

  const isMountedRef = useRef(false);
  const pollInFlightRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;

      try {
        const res = await fetch(`/api/calls/${callId}/messages`, {
          method: "GET",
          cache: "no-store",
          signal,
        });

        if (!res.ok) {
          if (!isMountedRef.current) return;
          setNetworkError(`Не удалось загрузить чат (${res.status})`);
          return;
        }

        const data = (await res.json()) as Message[];
        if (!isMountedRef.current) return;

        setItems(data);
        setNetworkError("");
      } catch (error) {
        if (!isMountedRef.current) return;
        if (error instanceof DOMException && error.name === "AbortError")
          return;

        setNetworkError("Проблемы с сетью: чат временно недоступен.");
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [callId],
  );

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();

    void load(controller.signal);

    const intervalId = setInterval(() => {
      void load(controller.signal);
    }, 2500);

    return () => {
      isMountedRef.current = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [load]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setNetworkError("");

    try {
      const res = await fetch(`/api/calls/${callId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        setNetworkError(`Не удалось отправить сообщение (${res.status})`);
        return;
      }

      setContent("");
      await load();
    } catch {
      setNetworkError("Проблемы с сетью: сообщение не отправлено.");
    } finally {
      if (isMountedRef.current) {
        setSending(false);
      }
    }
  }

  return (
    <div className="flex h-[320px] flex-col rounded-2xl border border-zinc-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((message) => (
          <div key={message.id} className="rounded-lg bg-zinc-100 p-2">
            <p className="text-xs text-zinc-500">{message.user.name}</p>
            <p className="text-sm text-zinc-900">{message.content}</p>
          </div>
        ))}

        {!items.length ? (
          <p className="text-sm text-zinc-500">Сообщений пока нет.</p>
        ) : null}
      </div>

      {networkError ? (
        <div className="border-t border-zinc-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {networkError}
        </div>
      ) : null}

      <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3">
        <input
          className="flex-1 rounded-lg border border-zinc-300 p-2"
          placeholder="Сообщение..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
        />
        <button
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          disabled={sending}
        >
          {sending ? "..." : "Отправить"}
        </button>
      </form>
    </div>
  );
}
