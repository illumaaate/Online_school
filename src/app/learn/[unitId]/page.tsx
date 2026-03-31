import Link from "next/link";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import LearnProgressClient from "@/features/courses/ui/LearnProgressClient";

function unitTypeLabel(unitType: string) {
  switch (unitType) {
    case "MATERIAL":
      return "Материал";
    case "VIDEO":
      return "Видео";
    case "TEST":
      return "Тест";
    case "LIVE":
      return "Live-урок";
    default:
      return unitType;
  }
}

function parseYouTubeId(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtube.com" || host === "m.youtube.com") {
      const watchId = url.searchParams.get("v");
      if (watchId) return watchId;

      const parts = url.pathname.split("/").filter(Boolean);
      const embedIndex = parts.findIndex((part) => part === "embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) return parts[embedIndex + 1];
      if (parts[0] === "shorts" && parts[1]) return parts[1];
    }

    if (host === "youtu.be") {
      const shortId = url.pathname.split("/").filter(Boolean)[0];
      if (shortId) return shortId;
    }

    return null;
  } catch {
    return null;
  }
}

function isLikelyVideoFile(rawUrl: string) {
  const lower = rawUrl.toLowerCase();
  return [".mp4", ".webm", ".ogg", ".mov", ".m4v"].some((ext) =>
    lower.includes(ext),
  );
}

export default async function LearnUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const user = await requireUser();
  const { unitId } = await params;

  const unit = await db.lessonUnit.findUnique({
    where: { id: unitId },
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              teacherId: true,
            },
          },
        },
      },
      material: true,
      tests: {
        include: {
          questions: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      lesson: true,
    },
  });

  if (!unit) {
    return (
      <section className="skillhub-panel rounded-[1.75rem] p-8">
        <h1 className="text-xl font-semibold">Юнит не найден</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Возможно, занятие было удалено или ссылка устарела.
        </p>
      </section>
    );
  }

  const courseProgram = await db.course.findUnique({
    where: { id: unit.module.course.id },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: {
          units: {
            orderBy: { position: "asc" },
            include: {
              tests: {
                select: { id: true, title: true },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const sidebarModules =
    courseProgram?.modules.map((module) => ({
      id: module.id,
      title: module.title,
      units: module.units.map((item) => ({
        id: item.id,
        title: item.title,
        unitType: item.unitType,
        tests: item.tests.map((test) => ({ id: test.id, title: test.title })),
      })),
    })) ?? [];

  const canManage =
    user.role === Role.ADMIN || user.id === unit.module.course.teacherId;

  const videoUrl = unit.material?.videoUrl?.trim() || "";
  const youtubeId = videoUrl ? parseYouTubeId(videoUrl) : null;
  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`
    : null;
  const showHtml5Video = !!videoUrl && !youtubeId;
  const hintVideoFormat =
    !!videoUrl && showHtml5Video && !isLikelyVideoFile(videoUrl);

  return (
    <section className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <Link href="/courses" className="hover:text-black hover:underline">
          Мои курсы
        </Link>
        <span>›</span>
        <Link
          href={`/courses/${unit.module.course.id}`}
          className="hover:text-black hover:underline"
        >
          {unit.module.course.title}
        </Link>
        <span>›</span>
        <span className="font-medium text-black">{unit.title}</span>
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <header className="skillhub-panel rounded-[1.75rem] p-6">
            <p className="skillhub-kicker text-xs font-medium">Урок</p>
            <h1 className="mt-2 text-2xl font-semibold text-black">{unit.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="skillhub-chip rounded-full px-3 py-1 text-xs font-medium">
                {unitTypeLabel(unit.unitType)}
              </span>
              {unit.tests.length ? (
                <span className="rounded-full border border-black/10 bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                  Тестов: {unit.tests.length}
                </span>
              ) : null}
            </div>
            {unit.description ? (
              <p className="mt-4 text-sm text-[var(--muted)]">{unit.description}</p>
            ) : null}
          </header>

          <article className="skillhub-panel rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold text-black">Материалы урока</h2>

            {unit.material?.content ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                {unit.material.content}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Текстовый материал пока не заполнен.
              </p>
            )}

            <div className="mt-5 rounded-[1.5rem] border border-black/10 bg-[var(--surface-muted)] p-4">
              <p className="mb-3 text-sm font-medium text-black">Видео урока</p>

              {!videoUrl ? (
                <p className="text-sm text-[var(--muted)]">
                  Видео для этого урока пока не добавлено.
                </p>
              ) : null}

              {youtubeEmbedUrl ? (
                <div className="overflow-hidden rounded-2xl border border-black/10 bg-black">
                  <div className="relative w-full pt-[56.25%]">
                    <iframe
                      src={youtubeEmbedUrl}
                      title={`Видео: ${unit.title}`}
                      className="absolute left-0 top-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : null}

              {showHtml5Video ? (
                <div className="space-y-3">
                  <video
                    className="w-full overflow-hidden rounded-2xl border border-black/10 bg-black"
                    src={videoUrl}
                    controls
                    preload="metadata"
                  />
                  {hintVideoFormat ? (
                    <p className="text-xs text-[var(--muted)]">
                      Если видео не воспроизводится во встроенном плеере, откройте
                      его по прямой ссылке ниже.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-[var(--accent-strong)] underline"
                >
                  Открыть видео в новой вкладке
                </a>
              ) : null}
            </div>
          </article>

          <article className="skillhub-panel rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold text-black">Тесты</h2>
            <div className="mt-3 space-y-2">
              {unit.tests.map((test, index) => (
                <Link
                  key={test.id}
                  href={`/tests/${test.id}`}
                  className="block rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 hover:border-[var(--accent)]"
                >
                  <p className="text-sm font-medium text-black">
                    {index + 1}. {test.title}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Вопросов: {test.questions.length}
                  </p>
                </Link>
              ))}
              {!unit.tests.length ? (
                <p className="text-sm text-[var(--muted)]">Тесты пока не добавлены.</p>
              ) : null}
            </div>
          </article>

          {unit.lesson ? (
            <article className="skillhub-panel rounded-[1.75rem] p-6">
              <h2 className="text-lg font-semibold text-black">Live-комната</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Для этого юнита есть связанная live-сессия.
              </p>
              <Link
                className="skillhub-button-primary mt-4 inline-block rounded-2xl px-4 py-2.5 text-sm font-medium"
                href={`/lesson/${unit.lesson.id}`}
              >
                Открыть live-урок
              </Link>
            </article>
          ) : null}

          {canManage ? (
            <article className="skillhub-panel rounded-[1.75rem] p-6">
              <h2 className="text-lg font-semibold text-black">Преподавателю</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Вы можете обновлять контент урока через API и добавлять тесты в
                этот юнит из панели курса.
              </p>
            </article>
          ) : null}
        </div>

        <LearnProgressClient
          courseId={unit.module.course.id}
          activeUnitId={unit.id}
          modules={sidebarModules}
          className="h-fit space-y-4 xl:sticky xl:top-6"
        />
      </div>
    </section>
  );
}
