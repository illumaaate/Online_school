"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Не удалось зарегистрироваться");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Сетевая ошибка. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="skillhub-panel space-y-4 rounded-[2rem] p-7">
      <div className="space-y-2">
        <p className="skillhub-kicker text-xs font-semibold">Новый аккаунт</p>
        <h2 className="text-2xl font-semibold text-black">Регистрация</h2>
        <p className="text-sm text-[var(--muted)]">
          Самостоятельная регистрация создает аккаунт студента в SkillHub.
        </p>
      </div>

      <input
        className="w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
        maxLength={80}
        required
      />

      <input
        className="w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={255}
        required
      />

      <input
        className="w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3"
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        maxLength={128}
        required
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        disabled={loading}
        className="skillhub-button-primary w-full rounded-2xl px-4 py-3 font-medium disabled:opacity-60"
      >
        {loading ? "Создаем аккаунт..." : "Создать аккаунт"}
      </button>
    </form>
  );
}
