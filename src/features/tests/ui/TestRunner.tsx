"use client";

import { useMemo, useState } from "react";
import { markUnitCompleted } from "@/features/courses/lib/progress";
import { MarkdownContent } from "@/features/courses/ui/MarkdownContent";

type Question = {
  id: string;
  question: string;
  type: "SINGLE" | "MULTI" | "OPEN" | "NUMBER";
  points: number;
  correctText?: string | null;
  options: Array<{ id: string; text: string; isCorrect?: boolean }>;
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
  letterAnswer: string;
};

function toLetter(index: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[index] ?? String(index + 1);
}

function parseLetterAnswer(input: string, optionsCount: number): number[] {
  const normalized = input
    .toUpperCase()
    .replaceAll(" ", "")
    .replaceAll(",", "")
    .replaceAll(";", "")
    .replaceAll(".", "");

  const cyrToLat: Record<string, string> = {
    А: "A",
    В: "B",
    С: "C",
    Д: "D",
    Е: "E",
    Ф: "F",
    Г: "G",
    Н: "H",
    И: "I",
    Ж: "J",
    К: "K",
    Л: "L",
    М: "M",
    П: "P",
    Р: "R",
    Т: "T",
    У: "U",
    Х: "X",
    Ы: "Y",
    З: "Z",
  };

  const indices = new Set<number>();
  for (const rawChar of normalized) {
    const char = cyrToLat[rawChar] ?? rawChar;
    const code = char.charCodeAt(0);
    if (code < 65 || code > 90) continue;

    const index = code - 65;
    if (index >= 0 && index < optionsCount) indices.add(index);
  }

  return [...indices].sort((a, b) => a - b);
}

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
  const [showChecks, setShowChecks] = useState(false);

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

      const letterAnswer = next
        .map((id) => {
          const idx = questions
            .find((q) => q.id === questionId)
            ?.options.findIndex((o) => o.id === id);
          return idx !== undefined && idx >= 0 ? toLetter(idx) : "";
        })
        .join("");

      return {
        ...prev,
        [questionId]: {
          selectedOptionIds: next,
          textAnswer: prev[questionId]?.textAnswer ?? "",
          letterAnswer,
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
        letterAnswer: prev[questionId]?.letterAnswer ?? "",
      },
    }));
  }

  function setLetterAnswer(question: Question, text: string) {
    const indices = parseLetterAnswer(text, question.options.length);
    const selectedOptionIds = indices
      .map((index) => question.options[index]?.id)
      .filter((id): id is string => Boolean(id));

    setAnswers((prev) => ({
      ...prev,
      [question.id]: {
        selectedOptionIds,
        textAnswer: prev[question.id]?.textAnswer ?? "",
        letterAnswer: text,
      },
    }));
  }

  function isLetterAnswerCorrect(question: Question): boolean | null {
    const current = answers[question.id];
    if (!current?.letterAnswer.trim()) return null;

    const correctOptionIds = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
      .sort();

    if (!correctOptionIds.length) return null;

    const selected = [...current.selectedOptionIds].sort();
    return JSON.stringify(selected) === JSON.stringify(correctOptionIds);
  }

  function isOpenOrNumberAnswerCorrect(question: Question): boolean | null {
    const expected = question.correctText?.trim();
    const given = answers[question.id]?.textAnswer?.trim();

    if (!expected || !given) return null;

    if (question.type === "NUMBER") {
      const expectedNumber = Number.parseFloat(expected);
      const givenNumber = Number.parseFloat(given);
      if (Number.isNaN(expectedNumber) || Number.isNaN(givenNumber))
        return null;
      return expectedNumber === givenNumber;
    }

    if (question.type === "OPEN") {
      return expected.toLowerCase() === given.toLowerCase();
    }

    return null;
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
      setShowChecks(true);

      if (relatedCourseId && relatedUnitId) {
        markUnitCompleted(relatedCourseId, relatedUnitId);
      }

      if (result.requiresReview) {
        setStatus(
          `Отправлено. Автооценка: ${result.score ?? 0}/${result.maxScore ?? 0}.`,
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
          <p className="text-sm font-semibold text-black">
            Вопрос {idx + 1}/{questions.length}
          </p>
          <div className="max-w-full align-top">
            <MarkdownContent
              content={question.question}
              showImageCaption={false}
            />
          </div>

          {question.type === "OPEN" ? (
            <>
              <textarea
                className="mt-2 w-full rounded-lg border border-zinc-300 p-2"
                value={answers[question.id]?.textAnswer ?? ""}
                onChange={(e) => setOpenAnswer(question.id, e.target.value)}
                placeholder="Введите развернутый ответ"
              />
              {showChecks && isOpenOrNumberAnswerCorrect(question) !== null ? (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    isOpenOrNumberAnswerCorrect(question)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  {isOpenOrNumberAnswerCorrect(question)
                    ? "Правильно"
                    : "Неправильно"}
                </div>
              ) : null}
            </>
          ) : question.type === "NUMBER" ? (
            <>
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-zinc-300 p-2"
                value={answers[question.id]?.textAnswer ?? ""}
                onChange={(e) => setOpenAnswer(question.id, e.target.value)}
                placeholder="Введите число"
              />
              {showChecks && isOpenOrNumberAnswerCorrect(question) !== null ? (
                <div
                  className={`mt-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                    isOpenOrNumberAnswerCorrect(question)
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  {isOpenOrNumberAnswerCorrect(question)
                    ? "Правильно"
                    : "Неправильно"}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-2 space-y-2">
              {question.options.map((option, optionIndex) => (
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
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-zinc-300 px-1 text-[11px] font-semibold text-zinc-700">
                    {toLetter(optionIndex)}
                  </span>
                  {option.text}
                </label>
              ))}

              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
                <p className="text-xs text-zinc-500">
                  Можно ответить буквами (например: A или AC)
                </p>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm uppercase"
                  value={answers[question.id]?.letterAnswer ?? ""}
                  onChange={(e) => setLetterAnswer(question, e.target.value)}
                  placeholder={question.type === "SINGLE" ? "A" : "AC"}
                />
                {showChecks && isLetterAnswerCorrect(question) !== null ? (
                  <div
                    className={`mt-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                      isLetterAnswerCorrect(question)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : "border-red-300 bg-red-50 text-red-700"
                    }`}
                  >
                    {isLetterAnswerCorrect(question)
                      ? "Правильно"
                      : "Неправильно"}
                  </div>
                ) : null}
              </div>
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
