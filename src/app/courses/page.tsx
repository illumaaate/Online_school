import { Role } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateCourseForm } from "@/features/courses/ui/CreateCourseForm";
import CourseCatalog, {
  type CatalogCourse,
} from "@/features/courses/ui/CourseCatalog";

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildDurationLabel(unitsCount: number, liveCount: number) {
  if (unitsCount === 0) return "Стартовый курс";
  const estimatedHours = Math.max(
    1,
    Math.round(unitsCount * 0.8 + liveCount * 0.5),
  );
  return `${estimatedHours} ч обучения`;
}

function buildTags(unitTypes: string[]) {
  const tags = new Set<string>();

  if (unitTypes.includes("MATERIAL")) tags.add("Теория");
  if (unitTypes.includes("VIDEO")) tags.add("Видео");
  if (unitTypes.includes("TEST")) tags.add("Тесты");
  if (unitTypes.includes("LIVE")) tags.add("Live");

  if (tags.size === 0) tags.add("Общий курс");
  return Array.from(tags);
}

export default async function CoursesPage() {
  const user = await requireUser();

  const courses = await db.course.findMany({
    include: {
      teacher: { select: { name: true } },
      enrollments: { select: { userId: true } },
      modules: {
        include: {
          units: {
            include: {
              tests: { select: { id: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const allTestIds = courses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.units.flatMap((unit) => unit.tests.map((test) => test.id)),
    ),
  );

  const attempts =
    allTestIds.length > 0
      ? await db.testAttempt.findMany({
          where: {
            studentId: user.id,
            submittedAt: { not: null },
            testId: { in: allTestIds },
          },
          select: { testId: true },
        })
      : [];

  const completedTestIds = new Set(attempts.map((attempt) => attempt.testId));

  const catalogCourses: CatalogCourse[] = courses.map((course) => {
    const units = course.modules.flatMap((module) => module.units);
    const tests = units.flatMap((unit) => unit.tests);
    const totalTests = tests.length;
    const submittedTests = tests.reduce(
      (count, test) => count + (completedTestIds.has(test.id) ? 1 : 0),
      0,
    );

    const enrolled = course.enrollments.some(
      (enrollment) => enrollment.userId === user.id,
    );

    let progressPercent = 0;
    if (totalTests > 0) {
      progressPercent = clampPercent((submittedTests / totalTests) * 100);
    } else if (enrolled && units.length > 0) {
      progressPercent = 10;
    }

    const unitTypes = units.map((unit) => unit.unitType);

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      teacherName: course.teacher.name,
      progressPercent,
      enrollmentsCount: course.enrollments.length,
      modulesCount: course.modules.length,
      unitsCount: units.length,
      testsCount: totalTests,
      level:
        units.length >= 40
          ? "Продвинутый"
          : units.length >= 20
            ? "Средний"
            : "Базовый",
      durationLabel: buildDurationLabel(
        units.length,
        unitTypes.filter((type) => type === "LIVE").length,
      ),
      updatedAt: course.updatedAt,
      isEnrolled: enrolled,
      tags: buildTags(unitTypes),
    };
  });

  const canManage = user.role === Role.ADMIN || user.role === Role.TEACHER;

  return (
    <section className="space-y-6">
      <div className="skillhub-hero rounded-[2rem] p-7 md:p-9">
        <p className="skillhub-kicker text-xs font-semibold text-[var(--accent)]">
          Catalog
        </p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
          Каталог SkillHub
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-white/80 md:text-base">
          Поиск, фильтры, статусы прохождения и прогресс по тестам — всё
          в одном месте.
        </p>
      </div>

      {canManage ? <CreateCourseForm /> : null}

      <CourseCatalog
        courses={catalogCourses}
        title="Все курсы"
        subtitle="Используйте поиск и фильтры, чтобы быстро находить нужные программы."
      />
    </section>
  );
}
