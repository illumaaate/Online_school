"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Не удалось выполнить вход");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="skillhub-panel space-y-4 rounded-[2rem] p-7">
      <div className="space-y-2">
        <p className="skillhub-kicker text-xs font-semibold">SkillHub</p>
        <h2 className="text-2xl font-semibold text-black">Вход в систему</h2>
        <p className="text-sm text-[var(--muted)]">
          Доступ к курсам, тестам и live-занятиям в единой образовательной среде.
        </p>
      </div>

      <input
        className="w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        disabled={loading}
        className="skillhub-button-primary w-full rounded-2xl px-4 py-3 font-medium disabled:opacity-60"
      >
        {loading ? "Выполняем вход..." : "Войти"}
      </button>
    </form>
  );
}
