"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function CourseActions({
  courseId,
  canManage,
  isAdmin = false,
}: {
  courseId: string;
  canManage: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const [moduleTitle, setModuleTitle] = useState("");
  const [unitTitle, setUnitTitle] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [modules, setModules] = useState<Array<{ id: string; title: string }>>([]);

  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionStartsAt, setSessionStartsAt] = useState("");
  const [sessionDuration, setSessionDuration] = useState(60);

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState({
    enroll: false,
    module: false,
    unit: false,
    session: false,
    delete: false,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fieldClass =
    "w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm";

  const loadModules = useCallback(async () => {
    const res = await fetch(`/api/courses/${courseId}/modules`, {
      cache: "no-store",
    });
    if (!res.ok) return;

    const data = (await res.json()) as Array<{ id: string; title: string }>;
    setModules(data);

    setSelectedModule((prev) => {
      if (prev && data.some((item) => item.id === prev)) return prev;
      return data[0]?.id ?? "";
    });
  }, [courseId]);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  async function enroll() {
    setStatus("");
    setLoading((prev) => ({ ...prev, enroll: true }));

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
      });

      setStatus(res.ok ? "Вы успешно записались на курс." : "Не удалось записаться.");
      if (res.ok) router.refresh();
    } catch {
      setStatus("Сетевая ошибка при записи на курс.");
    } finally {
      setLoading((prev) => ({ ...prev, enroll: false }));
    }
  }

  async function createModule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!moduleTitle.trim()) {
      setStatus("Введите название модуля.");
      return;
    }

    setStatus("");
    setLoading((prev) => ({ ...prev, module: true }));

    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: moduleTitle.trim() }),
      });

      if (!res.ok) {
        setStatus("Не удалось создать модуль.");
        return;
      }

      setModuleTitle("");
      setStatus("Модуль создан.");
      await loadModules();
      router.refresh();
    } catch {
      setStatus("Сетевая ошибка при создании модуля.");
    } finally {
      setLoading((prev) => ({ ...prev, module: false }));
    }
  }

  async function createUnit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedModule) {
      setStatus("Сначала создайте или выберите модуль.");
      return;
    }
    if (!unitTitle.trim()) {
      setStatus("Введите название занятия.");
      return;
    }

    setStatus("");
    setLoading((prev) => ({ ...prev, unit: true }));

    try {
      const res = await fetch(`/api/modules/${selectedModule}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: unitTitle.trim() }),
      });

      if (!res.ok) {
        setStatus("Не удалось создать занятие.");
        return;
      }

      setUnitTitle("");
      setStatus("Занятие добавлено в модуль.");
      router.refresh();
    } catch {
      setStatus("Сетевая ошибка при создании занятия.");
    } finally {
      setLoading((prev) => ({ ...prev, unit: false }));
    }
  }

  async function createLiveSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionTitle.trim() || !sessionStartsAt) {
      setStatus("Заполните название и дату live-сессии.");
      return;
    }

    setStatus("");
    setLoading((prev) => ({ ...prev, session: true }));

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: sessionTitle.trim(),
          startsAt: sessionStartsAt,
          durationMins: sessionDuration,
        }),
      });

      if (!res.ok) {
        setStatus("Не удалось создать live-сессию.");
        return;
      }

      setSessionTitle("");
      setSessionStartsAt("");
      setSessionDuration(60);
      setStatus("Live-сессия успешно создана.");
      router.refresh();
    } catch {
      setStatus("Сетевая ошибка при создании live-сессии.");
    } finally {
      setLoading((prev) => ({ ...prev, session: false }));
    }
  }

  async function deleteCourse() {
    setLoading((prev) => ({ ...prev, delete: true }));
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/courses");
        router.refresh();
      } else {
        setStatus("Не удалось удалить курс.");
        setConfirmDelete(false);
      }
    } catch {
      setStatus("Сетевая ошибка при удалении курса.");
      setConfirmDelete(false);
    } finally {
      setLoading((prev) => ({ ...prev, delete: false }));
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={enroll}
        disabled={loading.enroll}
        className="skillhub-button-primary rounded-2xl px-5 py-3 text-sm font-medium disabled:opacity-60"
      >
        {loading.enroll ? "Записываем..." : "Записаться на курс"}
      </button>

      {canManage ? (
        <div className="grid gap-3 md:grid-cols-3">
          <form onSubmit={createModule} className="skillhub-panel rounded-[1.5rem] p-4 space-y-3">
            <h3 className="text-base font-semibold text-black">Добавить модуль</h3>
            <input
              className={fieldClass}
              value={moduleTitle}
              onChange={(e) => setModuleTitle(e.target.value)}
              placeholder="Название модуля"
            />
            <button
              className="skillhub-button-outline rounded-2xl px-4 py-2.5 text-sm disabled:opacity-60"
              type="submit"
              disabled={loading.module}
            >
              {loading.module ? "Сохраняем..." : "Сохранить модуль"}
            </button>
          </form>

          <form onSubmit={createUnit} className="skillhub-panel rounded-[1.5rem] p-4 space-y-3">
            <h3 className="text-base font-semibold text-black">Добавить занятие</h3>

            <select
              className={fieldClass}
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
            >
              <option value="">Выберите модуль</option>
              {modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>

            <input
              className={fieldClass}
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="Название занятия"
            />

            <button
              className="skillhub-button-outline rounded-2xl px-4 py-2.5 text-sm disabled:opacity-60"
              type="submit"
              disabled={loading.unit}
            >
              {loading.unit ? "Сохраняем..." : "Сохранить занятие"}
            </button>
          </form>

          <form
            onSubmit={createLiveSession}
            className="skillhub-panel rounded-[1.5rem] p-4 space-y-3"
          >
            <h3 className="text-base font-semibold text-black">Создать live-сессию</h3>

            <input
              className={fieldClass}
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Название live-сессии"
            />

            <input
              className={fieldClass}
              value={sessionStartsAt}
              onChange={(e) => setSessionStartsAt(e.target.value)}
              type="datetime-local"
            />

            <input
              className={fieldClass}
              type="number"
              min={15}
              max={480}
              step={5}
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              placeholder="Длительность"
            />

            <button
              className="skillhub-button-outline rounded-2xl px-4 py-2.5 text-sm disabled:opacity-60"
              type="submit"
              disabled={loading.session}
            >
              {loading.session ? "Создаем..." : "Создать live-сессию"}
            </button>
          </form>
        </div>
      ) : null}

      {isAdmin && (
        <div className="pt-1">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:underline"
            >
              Удалить курс
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">
                Удалить курс безвозвратно? Все модули, занятия и тесты будут удалены.
              </span>
              <button
                type="button"
                onClick={deleteCourse}
                disabled={loading.delete}
                className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
              >
                {loading.delete ? "Удаление..." : "Да, удалить"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-2xl border border-black/10 px-4 py-2 text-sm text-[var(--muted)]"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      )}

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </div>
  );
}
