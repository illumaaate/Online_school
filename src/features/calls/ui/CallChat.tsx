"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string };
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function CallChat({ callId }: { callId: string }) {
  const [items, setItems] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [networkError, setNetworkError] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const pollInFlightRef = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const res = await fetch(`/api/calls/${callId}/messages`, { cache: "no-store", signal });
      if (!res.ok) {
        if (!isMountedRef.current) return;
        if (res.status === 499) return;
        setNetworkError(`Ошибка ${res.status}`);
        return;
      }
      const data = (await res.json()) as Message[];
      if (!isMountedRef.current) return;
      setItems(data);
      setNetworkError("");
    } catch (e) {
      if (!isMountedRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      setNetworkError("Нет соединения");
    } finally {
      pollInFlightRef.current = false;
    }
  }, [callId]);

  useEffect(() => {
    isMountedRef.current = true;
    const ctrl = new AbortController();
    void load(ctrl.signal);
    const id = setInterval(() => void load(ctrl.signal), 2500);
    return () => { isMountedRef.current = false; ctrl.abort(); clearInterval(id); };
  }, [load]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/calls/${callId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) { setNetworkError(`Ошибка ${res.status}`); return; }
      setContent("");
      await load();
    } catch {
      setNetworkError("Не отправлено");
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  }

  return (
    <div className="skillhub-panel flex h-[320px] flex-col rounded-xl overflow-hidden">
      <div className="border-b border-[var(--border)] px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Чат</p>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-[var(--muted)] pt-1">Сообщений пока нет</p>
        ) : (
          items.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent-strong)]">
                {initials(msg.user.name)}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-[var(--foreground)]">{msg.user.name} </span>
                <span className="text-xs text-[var(--muted)] break-words">{msg.content}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {networkError && (
        <p className="border-t border-red-100 bg-red-50 px-3 py-1 text-[11px] text-red-600">{networkError}</p>
      )}

      <form onSubmit={send} className="flex gap-2 border-t border-[var(--border)] px-2 py-2">
        <input
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          placeholder="Сообщение…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="skillhub-button-primary flex items-center justify-center rounded-lg p-1.5 disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
