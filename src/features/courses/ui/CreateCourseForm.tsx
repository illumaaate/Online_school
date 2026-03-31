"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateCourseForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Не удалось создать курс");
      return;
    }

    setTitle("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="skillhub-panel space-y-3 rounded-[1.75rem] p-5">
      <div>
        <p className="skillhub-kicker text-xs font-semibold">Управление</p>
        <h3 className="mt-2 text-lg font-semibold text-black">Создать курс</h3>
      </div>
      <input
        className="w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название курса"
      />
      <textarea
        className="min-h-28 w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={loading}
        className="skillhub-button-primary rounded-2xl px-4 py-3 text-sm font-medium disabled:opacity-60"
      >
        {loading ? "Создаем..." : "Создать"}
      </button>
    </form>
  );
}
