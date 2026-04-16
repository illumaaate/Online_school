"use client";

import { useState } from "react";

type Student = { id: string; name: string; email: string };
type Submission = {
  id: string;
  homeworkId: string;
  studentId: string;
  content: string;
  status: string;
  grade: number | null;
  comment: string | null;
  createdAt: string;
  student: Student;
};

export function HomeworkGradeClient({
  submissions,
}: {
  submissions: Submission[];
}) {
  const [list, setList] = useState<Submission[]>(submissions);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const pending = list.filter((s) => s.grade === null);
  const graded = list.filter((s) => s.grade !== null);

  async function save(submission: Submission) {
    const gradeVal = Number(grades[submission.id] ?? submission.grade ?? 0);
    if (isNaN(gradeVal) || gradeVal < 0 || gradeVal > 100) {
      setMessages((prev) => ({ ...prev, [submission.id]: "Оценка 0–100" }));
      return;
    }

    setSaving(submission.id);
    try {
      const res = await fetch(`/api/homework/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: gradeVal,
          comment: comments[submission.id] ?? submission.comment ?? "",
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Submission;
        setList((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        setMessages((prev) => ({ ...prev, [submission.id]: "Сохранено!" }));
      } else {
        setMessages((prev) => ({ ...prev, [submission.id]: "Ошибка сохранения" }));
      }
    } catch {
      setMessages((prev) => ({ ...prev, [submission.id]: "Ошибка сети" }));
    } finally {
      setSaving(null);
    }
  }

  if (!list.length) {
    return (
      <div className="skillhub-panel rounded-[1.75rem] p-8 text-center text-[var(--muted)]">
        Пока никто не сдал это задание.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-black">
            Ожидают проверки ({pending.length})
          </h2>
          {pending.map((sub) => (
            <div key={sub.id} className="skillhub-panel space-y-4 rounded-[1.75rem] p-5">
              <div>
                <p className="font-semibold text-black">{sub.student.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {sub.student.email} · Отправлено:{" "}
                  {new Date(sub.createdAt).toLocaleString("ru-RU")}
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4 text-sm text-black">
                {sub.content}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Оценка (0–100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={grades[sub.id] ?? ""}
                    onChange={(e) =>
                      setGrades((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    placeholder="0–100"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Комментарий
                  </label>
                  <input
                    type="text"
                    value={comments[sub.id] ?? ""}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    placeholder="Необязательно"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => save(sub)}
                  disabled={saving === sub.id}
                  className="skillhub-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {saving === sub.id ? "Сохраняем..." : "Выставить оценку"}
                </button>
                {messages[sub.id] ? (
                  <span className="text-sm text-[var(--muted)]">{messages[sub.id]}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {graded.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-black">
            Проверено ({graded.length})
          </h2>
          {graded.map((sub) => (
            <div
              key={sub.id}
              className="skillhub-panel space-y-3 rounded-[1.75rem] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-black">{sub.student.name}</p>
                  <p className="text-xs text-[var(--muted)]">{sub.student.email}</p>
                </div>
                <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                  {sub.grade}/100
                </span>
              </div>
              <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-3 text-sm text-black">
                {sub.content}
              </div>
              {sub.comment ? (
                <p className="text-sm text-[var(--muted)]">
                  Комментарий: {sub.comment}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Изменить оценку
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={grades[sub.id] ?? sub.grade ?? ""}
                    onChange={(e) =>
                      setGrades((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                    Комментарий
                  </label>
                  <input
                    type="text"
                    value={comments[sub.id] ?? sub.comment ?? ""}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [sub.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => save(sub)}
                  disabled={saving === sub.id}
                  className="skillhub-button-outline rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {saving === sub.id ? "Сохраняем..." : "Обновить оценку"}
                </button>
                {messages[sub.id] ? (
                  <span className="text-sm text-[var(--muted)]">{messages[sub.id]}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
