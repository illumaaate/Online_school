import Link from "next/link";
import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import LearnProgressClient from "@/features/courses/ui/LearnProgressClient";
import { UnitEditor } from "@/features/courses/ui/UnitEditor";
import { MarkdownContent } from "@/features/courses/ui/MarkdownContent";


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
      attachments: {
        orderBy: { createdAt: "asc" },
      },
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
            {(unit.unitType === "LIVE" || unit.tests.length > 0) ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {unit.unitType === "LIVE" ? (
                  <span className="skillhub-chip rounded-full px-3 py-1 text-xs font-medium">
                    Live-урок
                  </span>
                ) : null}
                {unit.tests.length ? (
                  <span className="rounded-full border border-black/10 bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                    Тестов: {unit.tests.length}
                  </span>
                ) : null}
              </div>
            ) : null}
            {unit.description ? (
              <p className="mt-4 text-sm text-[var(--muted)]">{unit.description}</p>
            ) : null}
          </header>

          {/* File attachments — shown BEFORE text content */}
          {unit.attachments.some((a) => a.type === "FILE") ? (
          <article className="skillhub-panel rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold text-black">Файлы для скачивания</h2>
            <ul className="mt-3 space-y-2">
              {unit.attachments
                .filter((a) => a.type === "FILE")
                .map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      download={file.name}
                      className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 hover:border-[var(--accent)]"
                    >
                      <svg className="h-5 w-5 shrink-0 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v14a2 2 0 01-2 2z" />
                      </svg>
                      <span className="flex-1 truncate text-sm font-medium text-black">{file.name}</span>
                      <svg className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </li>
                ))}
            </ul>
          </article>
          ) : null}

          {(unit.material?.content || videoUrl) ? (
          <article className="skillhub-panel rounded-[1.75rem] p-6">
            <h2 className="text-lg font-semibold text-black">Материалы урока</h2>

            {unit.material?.content ? (
              <MarkdownContent content={unit.material.content} />
            ) : null}

            {videoUrl ? (
              <div className={`rounded-[1.5rem] border border-black/10 bg-[var(--surface-muted)] p-4 ${unit.material?.content ? "mt-5" : "mt-3"}`}>
                <p className="mb-3 text-sm font-medium text-black">Видео урока</p>

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

                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-[var(--accent-strong)] underline"
                >
                  Открыть видео в новой вкладке
                </a>
              </div>
            ) : null}
          </article>
          ) : null}

          {unit.tests.length > 0 ? (
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
            </div>
          </article>
          ) : null}

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
            <UnitEditor
              unitId={unit.id}
              initialTitle={unit.title}
              initialDescription={unit.description ?? null}
              initialContent={unit.material?.content ?? null}
              initialVideoUrl={unit.material?.videoUrl ?? null}
            />
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
