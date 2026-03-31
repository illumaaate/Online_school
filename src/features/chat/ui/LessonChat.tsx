"use client";

import { useCallback, useEffect, useState } from "react";

type Message = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string };
};

export function LessonChat({ lessonId }: { lessonId: string }) {
  const [items, setItems] = useState<Message[]>([]);
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/lessons/${lessonId}/messages`);
    if (!res.ok) return;
    const data = (await res.json()) as Message[];
    setItems(data);
  }, [lessonId]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      void load();
    }, 0);
    const id = setInterval(() => {
      void load();
    }, 2500);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(id);
    };
  }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch(`/api/lessons/${lessonId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setContent("");
    await load();
  }

  return (
    <div className="flex h-[430px] flex-col rounded-2xl border border-zinc-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((message) => (
          <div key={message.id} className="rounded-lg bg-zinc-100 p-2">
            <p className="text-xs text-zinc-500">{message.user.name}</p>
            <p className="text-sm text-zinc-900">{message.content}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3">
        <input className="flex-1 rounded-lg border border-zinc-300 p-2" placeholder="Сообщение..." value={content} onChange={(e) => setContent(e.target.value)} />
        <button className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white">Отправить</button>
      </form>
    </div>
  );
}
