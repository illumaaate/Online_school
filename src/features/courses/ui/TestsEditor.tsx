"use client";

import { useCallback, useEffect, useState } from "react";

type QuestionType = "SINGLE" | "MULTI" | "OPEN";

interface TestOption {
  id: string;
  text: string;
  isCorrect: boolean;
  position: number;
}

interface TestQuestion {
  id: string;
  question: string;
  type: QuestionType;
  points: number;
  correctText: string | null;
  options: TestOption[];
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  questions: TestQuestion[];
}

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none";

function QuestionEditor({
  question,
  onSaved,
  onDeleted,
}: {
  question: TestQuestion;
  onSaved: (q: TestQuestion) => void;
  onDeleted: (id: string) => void;
}) {
  const [text, setText] = useState(question.question);
  const [type, setType] = useState<QuestionType>(question.type);
  const [points, setPoints] = useState(question.points);
  const [correctText, setCorrectText] = useState(question.correctText ?? "");
  const [options, setOptions] = useState<Array<{ text: string; isCorrect: boolean }>>(
    question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
  );
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  function addOption() {
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeOption(i: number) {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleCorrect(i: number) {
    setOptions((prev) =>
      prev.map((opt, idx) => {
        if (type === "SINGLE") return { ...opt, isCorrect: idx === i };
        return idx === i ? { ...opt, isCorrect: !opt.isCorrect } : opt;
      }),
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text.trim(),
          type,
          points,
          correctText: type === "OPEN" ? correctText.trim() || null : null,
          options: type !== "OPEN" ? options.filter((o) => o.text.trim()) : [],
        }),
      });
      if (res.ok) {
        const updated = (await res.json()) as TestQuestion;
        onSaved(updated);
        setOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    const res = await fetch(`/api/questions/${question.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(question.id);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent-strong)]">
          {question.type === "OPEN" ? "?" : question.type === "MULTI" ? "M" : "•"}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-black">
          {question.question || "Без текста"}
        </span>
        <span className="shrink-0 text-xs text-[var(--muted)]">{question.points} б.</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-black/10 px-4 pb-4 pt-3 space-y-3">
          <textarea
            className={`${fieldClass} resize-none`}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст вопроса"
          />

          <div className="flex gap-2">
            <select className={`${fieldClass} flex-1`} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
              <option value="SINGLE">Один ответ</option>
              <option value="MULTI">Несколько ответов</option>
              <option value="OPEN">Открытый ответ</option>
            </select>
            <input
              type="number"
              min={1}
              max={100}
              className="w-20 rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              title="Баллы"
            />
          </div>

          {type === "OPEN" ? (
            <div className="space-y-1">
              <p className="text-xs text-[var(--muted)]">Правильный ответ (для автопроверки)</p>
              <input className={fieldClass} value={correctText} onChange={(e) => setCorrectText(e.target.value)} placeholder="Ожидаемый ответ..." />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted)]">Варианты ответа — отметьте правильные</p>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(i)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      opt.isCorrect ? "border-green-500 bg-green-500 text-white" : "border-black/20 bg-white"
                    }`}
                  >
                    {opt.isCorrect && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <input
                    className="flex-1 rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                    value={opt.text}
                    onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? { ...o, text: e.target.value } : o))}
                    placeholder={`Вариант ${i + 1}`}
                  />
                  <button type="button" onClick={() => removeOption(i)} className="shrink-0 text-red-400 hover:text-red-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addOption} className="text-xs text-[var(--accent-strong)] hover:underline">
                + Добавить вариант
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="skillhub-button-primary rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-60"
            >
              {saving ? "Сохранение..." : "Сохранить вопрос"}
            </button>
            <button
              type="button"
              onClick={del}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              Удалить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TestItem({
  test,
  onDeleted,
  onUpdated,
}: {
  test: Test;
  onDeleted: (id: string) => void;
  onUpdated: (t: Test) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(test.title);
  const [description, setDescription] = useState(test.description ?? "");
  const [questions, setQuestions] = useState<TestQuestion[]>(test.questions);
  const [saving, setSaving] = useState(false);
  const [addingQ, setAddingQ] = useState(false);
  const [newQ, setNewQ] = useState({ text: "", type: "SINGLE" as QuestionType, points: 1 });
  const [newQOptions, setNewQOptions] = useState<Array<{ text: string; isCorrect: boolean }>>([]);
  const [confirmDel, setConfirmDel] = useState(false);

  async function saveTest() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Test;
        onUpdated({ ...updated, questions });
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteTest() {
    const res = await fetch(`/api/tests/${test.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(test.id);
  }

  async function addQuestion() {
    if (!newQ.text.trim()) return;
    setAddingQ(true);
    try {
      const res = await fetch(`/api/tests/${test.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQ.text.trim(),
          type: newQ.type,
          points: newQ.points,
          options: newQ.type !== "OPEN" ? newQOptions.filter((o) => o.text.trim()) : undefined,
        }),
      });
      if (res.ok) {
        const q = (await res.json()) as TestQuestion;
        setQuestions((prev) => [...prev, q]);
        setNewQ({ text: "", type: "SINGLE", points: 1 });
        setNewQOptions([]);
      }
    } finally {
      setAddingQ(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-[var(--surface-muted)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-black">{test.title}</p>
          <p className="text-xs text-[var(--muted)]">{questions.length} вопр.</p>
        </div>
        <svg
          className={`h-4 w-4 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-black/10 px-4 pb-4 pt-3 space-y-4">
          {/* Title / description */}
          <div className="space-y-2">
            <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название теста" />
            <input className={fieldClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" />
            <button type="button" onClick={saveTest} disabled={saving} className="skillhub-button-outline rounded-xl px-4 py-2 text-xs disabled:opacity-60">
              {saving ? "Сохранение..." : "Сохранить название"}
            </button>
          </div>

          {/* Questions */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted)]">Вопросы</p>
            {questions.map((q) => (
              <QuestionEditor
                key={q.id}
                question={q}
                onSaved={(updated) => setQuestions((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
                onDeleted={(id) => setQuestions((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
            {questions.length === 0 && (
              <p className="text-xs text-[var(--muted)]">Вопросов пока нет.</p>
            )}
          </div>

          {/* Add question */}
          <div className="rounded-2xl border border-dashed border-black/15 p-3 space-y-2">
            <p className="text-xs font-medium text-[var(--muted)]">Новый вопрос</p>
            <textarea
              className={`${fieldClass} resize-none`}
              rows={2}
              value={newQ.text}
              onChange={(e) => setNewQ((p) => ({ ...p, text: e.target.value }))}
              placeholder="Текст вопроса..."
            />
            <div className="flex gap-2">
              <select
                className={`${fieldClass} flex-1`}
                value={newQ.type}
                onChange={(e) => {
                  setNewQ((p) => ({ ...p, type: e.target.value as QuestionType }));
                  setNewQOptions([]);
                }}
              >
                <option value="SINGLE">Один ответ</option>
                <option value="MULTI">Несколько ответов</option>
                <option value="OPEN">Открытый ответ</option>
              </select>
              <input
                type="number" min={1} max={100}
                className="w-20 rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
                value={newQ.points}
                onChange={(e) => setNewQ((p) => ({ ...p, points: Number(e.target.value) }))}
                title="Баллы"
              />
            </div>

            {newQ.type !== "OPEN" && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--muted)]">Варианты ответа — отметьте правильные</p>
                {newQOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewQOptions((prev) =>
                          prev.map((o, idx) => {
                            if (newQ.type === "SINGLE") return { ...o, isCorrect: idx === i };
                            return idx === i ? { ...o, isCorrect: !o.isCorrect } : o;
                          }),
                        )
                      }
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        opt.isCorrect ? "border-green-500 bg-green-500 text-white" : "border-black/20 bg-white"
                      }`}
                    >
                      {opt.isCorrect && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <input
                      className="flex-1 rounded-xl border border-black/10 bg-[var(--surface-muted)] px-3 py-1.5 text-sm focus:border-[var(--accent)] focus:outline-none"
                      value={opt.text}
                      onChange={(e) =>
                        setNewQOptions((prev) =>
                          prev.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)),
                        )
                      }
                      placeholder={`Вариант ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setNewQOptions((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-red-400 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setNewQOptions((prev) => [...prev, { text: "", isCorrect: false }])}
                  className="text-xs text-[var(--accent-strong)] hover:underline"
                >
                  + Добавить вариант
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={addQuestion}
              disabled={addingQ || !newQ.text.trim()}
              className="skillhub-button-primary rounded-xl px-4 py-2 text-xs font-medium disabled:opacity-60"
            >
              {addingQ ? "Добавление..." : "Добавить вопрос"}
            </button>
          </div>

          {/* Delete test */}
          <div className="pt-1">
            {!confirmDel ? (
              <button type="button" onClick={() => setConfirmDel(true)} className="text-xs text-red-500 hover:underline">
                Удалить тест
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Удалить тест безвозвратно?</span>
                <button type="button" onClick={deleteTest} className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Да</button>
                <button type="button" onClick={() => setConfirmDel(false)} className="rounded-xl border border-black/10 px-3 py-1.5 text-xs text-[var(--muted)]">Нет</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TestsEditor({ unitId }: { unitId: string }) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests?unitId=${unitId}`);
      if (res.ok) setTests((await res.json()) as Test[]);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => { void load(); }, [load]);

  async function createTest() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), unitId }),
      });
      if (res.ok) {
        const t = (await res.json()) as Test;
        setTests((prev) => [...prev, { ...t, questions: [] }]);
        setNewTitle("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[var(--muted)]">Тесты к уроку</p>

      {loading ? (
        <p className="text-xs text-[var(--muted)]">Загрузка...</p>
      ) : (
        <div className="space-y-2">
          {tests.map((t) => (
            <TestItem
              key={t.id}
              test={t}
              onDeleted={(id) => setTests((prev) => prev.filter((x) => x.id !== id))}
              onUpdated={(updated) => setTests((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
            />
          ))}
          {tests.length === 0 && <p className="text-xs text-[var(--muted)]">Тестов пока нет.</p>}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className={`${fieldClass} flex-1`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Название нового теста..."
          onKeyDown={(e) => { if (e.key === "Enter") void createTest(); }}
        />
        <button
          type="button"
          onClick={createTest}
          disabled={creating || !newTitle.trim()}
          className="skillhub-button-primary shrink-0 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {creating ? "..." : "Создать тест"}
        </button>
      </div>
    </div>
  );
}
