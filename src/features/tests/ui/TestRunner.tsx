"use client";

import { useMemo, useState } from "react";
import { markUnitCompleted } from "@/features/courses/lib/progress";

type Question = {
  id: string;
  question: string;
  type: "SINGLE" | "MULTI" | "OPEN";
  points: number;
  options: Array<{ id: string; text: string }>;
};

type TestSubmitResult = {
  score?: number;
  maxScore?: number;
  requiresReview?: boolean;
};

type TestRunnerProps = {
  testId: string;
  questions: Question[];
  relatedCourseId?: string;
  relatedUnitId?: string;
  onCompleted?: (result: TestSubmitResult) => void;
};

type AnswerState = {
  selectedOptionIds: string[];
  textAnswer: string;
};

export function TestRunner({
  testId,
  questions,
  relatedCourseId,
  relatedUnitId,
  onCompleted,
}: TestRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const payload = useMemo(
    () =>
      Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        selectedOptionIds: value.selectedOptionIds,
        textAnswer: value.textAnswer,
      })),
    [answers],
  );

  function toggleOption(questionId: string, optionId: string, single: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId]?.selectedOptionIds ?? [];
      const has = current.includes(optionId);

      const next = single
        ? has
          ? []
          : [optionId]
        : has
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];

      return {
        ...prev,
        [questionId]: {
          selectedOptionIds: next,
          textAnswer: prev[questionId]?.textAnswer ?? "",
        },
      };
    });
  }

  function setOpenAnswer(questionId: string, text: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
        textAnswer: text,
      },
    }));
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setStatus("Сохраняем ответы...");

    try {
      const attemptRes = await fetch(`/api/tests/${testId}/attempts`, {
        method: "POST",
      });

      if (!attemptRes.ok) {
        setStatus("Не удалось создать попытку теста.");
        return;
      }

      const attempt = (await attemptRes.json()) as { id: string };
      if (!attempt?.id) {
        setStatus("Сервер вернул некорректный ответ по попытке.");
        return;
      }

      const submitRes = await fetch(`/api/attempts/${attempt.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (!submitRes.ok) {
        setStatus("Не удалось отправить ответы.");
        return;
      }

      const result = (await submitRes.json()) as TestSubmitResult;

      if (relatedCourseId && relatedUnitId) {
        markUnitCompleted(relatedCourseId, relatedUnitId);
      }

      if (result.requiresReview) {
        setStatus(
          `Отправлено. Автооценка: ${result.score ?? 0}/${result.maxScore ?? 0}. Есть ответы на ручную проверку.`,
        );
      } else {
        setStatus(
          `Готово. Результат: ${result.score ?? 0}/${result.maxScore ?? 0}.`,
        );
      }

      onCompleted?.(result);
    } catch {
      setStatus("Ошибка сети. Попробуйте отправить тест еще раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {questions.map((question, idx) => (
        <div
          key={question.id}
          className="rounded-xl border border-zinc-200 bg-white p-4"
        >
          <p className="font-medium">
            {idx + 1}. {question.question}
          </p>
          <p className="text-xs text-zinc-500">
            Тип: {question.type} | Баллы: {question.points}
          </p>

          {question.type === "OPEN" ? (
            <textarea
              className="mt-2 w-full rounded-lg border border-zinc-300 p-2"
              value={answers[question.id]?.textAnswer ?? ""}
              onChange={(e) => setOpenAnswer(question.id, e.target.value)}
              placeholder="Введите развернутый ответ"
            />
          ) : (
            <div className="mt-2 space-y-2">
              {question.options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type={question.type === "SINGLE" ? "radio" : "checkbox"}
                    checked={(
                      answers[question.id]?.selectedOptionIds ?? []
                    ).includes(option.id)}
                    onChange={() =>
                      toggleOption(
                        question.id,
                        option.id,
                        question.type === "SINGLE",
                      )
                    }
                  />
                  {option.text}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {submitting ? "Отправляем..." : "Отправить тест"}
      </button>

      {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
    </div>
  );
}
