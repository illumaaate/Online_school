"use client";

import { useState } from "react";

type Question = { id: string; question: string; type: string; points: number };
type Answer = {
  id: string;
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  question: Question;
};
type Attempt = {
  id: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  requiresReview: boolean;
  student: { id: string; name: string; email: string };
  answers: Answer[];
};

export function TestReviewClient({
  testId,
  initialAttempts,
}: {
  testId: string;
  initialAttempts: Attempt[];
}) {
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  const pendingAttempts = attempts.filter((a) => a.requiresReview);
  const doneAttempts = attempts.filter((a) => !a.requiresReview && a.submittedAt);

  function getOpenAnswers(attempt: Attempt) {
    return attempt.answers.filter((a) => a.question.type === "OPEN");
  }

  async function gradeAttempt(attempt: Attempt) {
    const openAnswers = getOpenAnswers(attempt);
    const grades = openAnswers.map((answer) => {
      const raw = scores[answer.id];
      const score = raw !== undefined ? Number(raw) : (answer.score ?? 0);
      const max = answer.question.points;
      return {
        answerId: answer.id,
        score: Math.min(max, Math.max(0, score)),
        isCorrect: score >= max,
      };
    });

    setSaving(attempt.id);
    try {
      const res = await fetch(`/api/attempts/${attempt.id}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades }),
      });
      if (res.ok) {
        setMessages((prev) => ({ ...prev, [attempt.id]: "Сохранено!" }));
        setAttempts((prev) =>
          prev.map((a) =>
            a.id === attempt.id
              ? {
                  ...a,
                  requiresReview: false,
                  answers: a.answers.map((ans) => {
                    const g = grades.find((gr) => gr.answerId === ans.id);
                    return g ? { ...ans, score: g.score, isCorrect: g.isCorrect } : ans;
                  }),
                }
              : a,
          ),
        );
      } else {
        setMessages((prev) => ({ ...prev, [attempt.id]: "Ошибка сохранения" }));
      }
    } catch {
      setMessages((prev) => ({ ...prev, [attempt.id]: "Ошибка сети" }));
    } finally {
      setSaving(null);
    }
  }

  if (!attempts.length) {
    return (
      <div className="skillhub-panel rounded-[1.75rem] p-8 text-center text-[var(--muted)]">
        Нет ни одной попытки по этому тесту.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingAttempts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-black">
            Требуют проверки ({pendingAttempts.length})
          </h2>
          {pendingAttempts.map((attempt) => {
            const openAnswers = getOpenAnswers(attempt);
            return (
              <div
                key={attempt.id}
                className="skillhub-panel space-y-4 rounded-[1.75rem] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-black">{attempt.student.name}</p>
                    <p className="text-xs text-[var(--muted)]">{attempt.student.email}</p>
                  </div>
                  <div className="text-right text-sm text-[var(--muted)]">
                    Автооценка: {attempt.score ?? 0}/{attempt.maxScore ?? 0}
                  </div>
                </div>

                <div className="space-y-4">
                  {openAnswers.map((answer) => (
                    <div
                      key={answer.id}
                      className="rounded-2xl border border-black/10 bg-[var(--surface-muted)] p-4"
                    >
                      <p className="text-sm font-medium text-black">
                        {answer.question.question}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Макс. баллов: {answer.question.points}
                      </p>
                      <div className="mt-2 rounded-xl border border-black/10 bg-white p-3 text-sm text-black">
                        {answer.textAnswer || (
                          <span className="text-[var(--muted)]">Ответ не дан</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-xs text-[var(--muted)]">Баллов:</label>
                        <input
                          type="number"
                          min={0}
                          max={answer.question.points}
                          value={scores[answer.id] ?? answer.score ?? ""}
                          onChange={(e) =>
                            setScores((prev) => ({
                              ...prev,
                              [answer.id]: e.target.value,
                            }))
                          }
                          className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                          placeholder={`0–${answer.question.points}`}
                        />
                        <span className="text-xs text-[var(--muted)]">
                          / {answer.question.points}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => gradeAttempt(attempt)}
                    disabled={saving === attempt.id}
                    className="skillhub-button-primary rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    {saving === attempt.id ? "Сохраняем..." : "Сохранить оценки"}
                  </button>
                  {messages[attempt.id] ? (
                    <span className="text-sm text-[var(--muted)]">
                      {messages[attempt.id]}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {doneAttempts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-black">
            Проверено ({doneAttempts.length})
          </h2>
          {doneAttempts.map((attempt) => (
            <div
              key={attempt.id}
              className="skillhub-panel-muted flex flex-wrap items-center justify-between gap-2 rounded-2xl px-5 py-4"
            >
              <div>
                <p className="font-medium text-black">{attempt.student.name}</p>
                <p className="text-xs text-[var(--muted)]">{attempt.student.email}</p>
              </div>
              <span className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                {attempt.score ?? 0} / {attempt.maxScore ?? 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
