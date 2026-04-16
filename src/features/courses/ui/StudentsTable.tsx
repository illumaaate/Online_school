"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  enrolledAt: Date;
  testsDone: number;
  testsTotal: number;
  avgScore: number | null;
  hwDone: number;
  hwTotal: number;
  unitsCompleted: number;
  unitProgressPct: number;
};

function scoreBg(pct: number | null) {
  if (pct === null) return "bg-[var(--surface-muted)] text-[var(--muted)]";
  if (pct >= 80) return "bg-emerald-50 text-emerald-700";
  if (pct >= 50) return "bg-[var(--accent-soft)] text-[var(--accent-strong)]";
  return "bg-red-50 text-red-600";
}

export function StudentsTable({
  students,
  courseId,
}: {
  students: StudentRow[];
  courseId: string;
}) {
  const router = useRouter();

  if (students.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">На курс пока никто не записался.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs text-[var(--muted)]">
            <th className="pb-2 pr-4 font-medium">Студент</th>
            <th className="pb-2 pr-4 font-medium text-right">Прогресс</th>
            <th className="pb-2 pr-4 font-medium text-right">Тесты</th>
            <th className="pb-2 pr-4 font-medium text-right">Средний балл</th>
            <th className="pb-2 pr-4 font-medium text-right">ДЗ</th>
            <th className="pb-2 pr-4 font-medium text-right">Записан</th>
            <th className="pb-2 w-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {students.map((s) => (
            <tr
              key={s.id}
              className="group cursor-pointer transition hover:bg-[var(--surface-muted)]"
              onClick={() => router.push(`/courses/${courseId}/stats/${s.id}`)}
            >
              <td className="py-3 pr-4">
                <Link
                  href={`/courses/${courseId}/stats/${s.id}`}
                  className="font-medium text-black group-hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {s.name}
                </Link>
                <p className="text-xs text-[var(--muted)]">{s.email}</p>
              </td>
              <td className="py-3 pr-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-black/8">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${s.unitProgressPct}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-[var(--muted)]">{s.unitProgressPct}%</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-right">
                <span className={s.testsDone === 0 ? "text-[var(--muted)]" : "text-black"}>
                  {s.testsDone}
                </span>
                <span className="text-[var(--muted)]"> / {s.testsTotal}</span>
              </td>
              <td className="py-3 pr-4 text-right">
                {s.avgScore !== null ? (
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${scoreBg(s.avgScore)}`}>
                    {s.avgScore}%
                  </span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">—</span>
                )}
              </td>
              <td className="py-3 pr-4 text-right">
                <span className={
                  s.hwDone === 0 && s.hwTotal > 0
                    ? "text-red-600 font-medium"
                    : s.hwDone === s.hwTotal && s.hwTotal > 0
                      ? "text-emerald-600 font-medium"
                      : "text-[var(--muted)]"
                }>
                  {s.hwDone}
                </span>
                <span className="text-[var(--muted)]"> / {s.hwTotal}</span>
              </td>
              <td className="py-3 pr-4 text-right text-xs text-[var(--muted)]">
                {new Date(s.enrolledAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="py-3 text-right">
                <svg
                  className="h-4 w-4 text-[var(--muted)] opacity-0 transition group-hover:opacity-100"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
