"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Student = { id: string; name: string; email: string };

export function CreateCallForm({ students }: { students: Student[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;

    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, topic, scheduledAt: scheduledAt || undefined }),
    });
    if (!res.ok) {
      setStatus("Не удалось создать звонок");
      return;
    }
    const call = (await res.json()) as { id: string; inviteToken: string };
    setStatus(`Ссылка ученику: /join/${call.inviteToken}`);
    router.push(`/calls/${call.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4">
      <h3 className="font-semibold">Новый звонок</h3>
      <select className="w-full rounded-lg border border-zinc-300 p-2" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} ({student.email})
          </option>
        ))}
      </select>
      <input className="w-full rounded-lg border border-zinc-300 p-2" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема звонка" />
      <input className="w-full rounded-lg border border-zinc-300 p-2" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      <button className="skillhub-button-primary rounded-xl px-4 py-2 text-sm font-medium">Создать звонок</button>
      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </form>
  );
}
