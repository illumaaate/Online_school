"use client";

import { useState } from "react";
import { Role } from "@prisma/client";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  TEACHER: "Преподаватель",
  STUDENT: "Студент",
};

export function ProfileClient({
  initialName,
  email,
  role,
}: {
  initialName: string;
  email: string;
  role: Role;
}) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ text: "Новые пароли не совпадают", error: true });
      return;
    }

    const body: Record<string, string> = {};
    if (name.trim() !== initialName) body.name = name.trim();
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    if (!Object.keys(body).length) {
      setMessage({ text: "Нечего сохранять", error: false });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; name?: string };
      if (res.ok) {
        setMessage({ text: "Профиль обновлён", error: false });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ text: data.error ?? "Ошибка сохранения", error: true });
      }
    } catch {
      setMessage({ text: "Ошибка сети", error: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <form onSubmit={saveProfile} className="skillhub-panel space-y-5 rounded-[1.75rem] p-6">
        <div>
          <h2 className="text-base font-semibold text-black">Личные данные</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Изменение имени и пароля аккаунта
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">
            Имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-black">
            Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-xl border border-zinc-200 bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--muted)]"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Email изменить нельзя</p>
        </div>

        <div className="border-t border-black/10 pt-5">
          <h3 className="mb-4 text-sm font-semibold text-black">Изменить пароль</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Текущий пароль
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Оставьте пустым, если не меняете"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Новый пароль
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-black">
                Подтвердите пароль
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите новый пароль"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        {message ? (
          <p
            className={`rounded-xl px-4 py-3 text-sm ${
              message.error
                ? "bg-red-50 text-red-700"
                : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="skillhub-button-primary w-full rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Сохраняем..." : "Сохранить изменения"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="skillhub-panel rounded-[1.75rem] p-5">
          <h3 className="text-sm font-semibold text-black">Информация об аккаунте</h3>
          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-[var(--muted)]">Роль</dt>
              <dd className="skillhub-chip rounded-lg px-2.5 py-1 text-xs font-semibold">
                {ROLE_LABELS[role]}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-[var(--muted)]">Email</dt>
              <dd className="text-sm font-medium text-black">{email}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
