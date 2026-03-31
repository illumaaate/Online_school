"use client";

import { useState } from "react";

type Homework = { id: string; title: string; description: string };

export function HomeworkPanel({
  lessonId,
  homeworks,
  canCreate,
}: {
  lessonId: string;
  homeworks: Homework[];
  canCreate: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submission, setSubmission] = useState<Record<string, string>>({});
  const [info, setInfo] = useState("");

  async function createHomework(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/lessons/${lessonId}/homework`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    setInfo(res.ok ? "Домашка добавлена. Обновите страницу." : "Не удалось добавить домашку");
  }

  async function submitHomework(homeworkId: string) {
    const res = await fetch(`/api/homework/${homeworkId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: submission[homeworkId] ?? "" }),
    });
    setInfo(res.ok ? "Решение отправлено" : "Не удалось отправить решение");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">Домашние задания</h2>
      {canCreate ? (
        <form onSubmit={createHomework} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <input className="w-full rounded-lg border border-zinc-300 p-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название задания" />
          <textarea className="w-full rounded-lg border border-zinc-300 p-2" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание задания" />
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">Добавить</button>
        </form>
      ) : null}

      <div className="space-y-3">
        {homeworks.map((hw) => (
          <div key={hw.id} className="rounded-xl border border-zinc-200 p-3">
            <p className="font-medium">{hw.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{hw.description}</p>
            <textarea
              className="mt-2 w-full rounded-lg border border-zinc-300 p-2"
              placeholder="Ваш ответ"
              value={submission[hw.id] ?? ""}
              onChange={(e) => setSubmission((prev) => ({ ...prev, [hw.id]: e.target.value }))}
            />
            <button className="mt-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm" onClick={() => submitHomework(hw.id)}>
              Отправить решение
            </button>
          </div>
        ))}
        {!homeworks.length ? <p className="text-sm text-zinc-600">Пока нет домашних заданий.</p> : null}
      </div>

      {info ? <p className="text-sm text-zinc-600">{info}</p> : null}
    </div>
  );
}
