import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo12345";

const IDS = {
  course: "seed_course_skillspace_js",
  moduleBasics: "seed_module_basics",
  moduleLive: "seed_module_live",
  lessonLive: "seed_lesson_live_1",
  lessonLegacy: "seed_lesson_legacy_1",
  unitMaterial: "seed_unit_material_1",
  unitLive: "seed_unit_live_1",
  material: "seed_material_1",
  test: "seed_test_1",
  homework: "seed_homework_1",
  call: "seed_call_1",
};

const TOKENS = {
  callInvite: "seedinvite0001skillspace",
};

const DATES = {
  lessonLiveStartsAt: new Date("2026-09-10T16:00:00.000Z"),
  lessonLegacyStartsAt: new Date("2026-09-12T16:00:00.000Z"),
  callScheduledAt: new Date("2026-09-10T15:50:00.000Z"),
  homeworkDueAt: new Date("2026-09-17T23:59:00.000Z"),
};

async function upsertUser({ name, email, role }) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { name, email, role, passwordHash },
  });
}

async function main() {
  console.log("🌱 Seeding deterministic demo data...");

  // 1) Demo users
  const admin = await upsertUser({
    name: "Demo Admin",
    email: "admin@skillspace.local",
    role: "ADMIN",
  });

  const teacher = await upsertUser({
    name: "Demo Teacher",
    email: "teacher@skillspace.local",
    role: "TEACHER",
  });

  const studentA = await upsertUser({
    name: "Demo Student",
    email: "student@skillspace.local",
    role: "STUDENT",
  });

  const studentB = await upsertUser({
    name: "Demo Student 2",
    email: "student2@skillspace.local",
    role: "STUDENT",
  });

  // 2) Recreate seeded course subtree (clean deterministic state)
  await prisma.course.deleteMany({
    where: { id: IDS.course },
  });

  await prisma.course.create({
    data: {
      id: IDS.course,
      title: "JavaScript для начинающих (Demo)",
      description:
        "Демо-курс для курсового проекта: материалы, тест, live-урок, домашка и звонки.",
      teacherId: teacher.id,
    },
  });

  // 3) Enroll demo students
  await prisma.enrollment.createMany({
    data: [
      { userId: studentA.id, courseId: IDS.course },
      { userId: studentB.id, courseId: IDS.course },
    ],
    skipDuplicates: true,
  });

  // 4) Modules
  await prisma.courseModule.createMany({
    data: [
      {
        id: IDS.moduleBasics,
        courseId: IDS.course,
        title: "Модуль 1: Основы",
        position: 0,
      },
      {
        id: IDS.moduleLive,
        courseId: IDS.course,
        title: "Модуль 2: Практика вживую",
        position: 1,
      },
    ],
    skipDuplicates: true,
  });

  // 5) Lessons + rooms (legacy/live pages)
  await prisma.lesson.createMany({
    data: [
      {
        id: IDS.lessonLegacy,
        title: "Legacy-урок: Введение в JS",
        startsAt: DATES.lessonLegacyStartsAt,
        durationMins: 60,
        courseId: IDS.course,
        roomName: "seed-legacy-room-1",
      },
      {
        id: IDS.lessonLive,
        title: "Live-урок: Разбор задач",
        startsAt: DATES.lessonLiveStartsAt,
        durationMins: 90,
        courseId: IDS.course,
        roomName: "seed-live-room-1",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.lessonRoom.createMany({
    data: [{ lessonId: IDS.lessonLegacy }, { lessonId: IDS.lessonLive }],
    skipDuplicates: true,
  });

  // Optional participants for demo visibility
  await prisma.lessonParticipant.createMany({
    data: [
      { userId: teacher.id, lessonId: IDS.lessonLegacy },
      { userId: studentA.id, lessonId: IDS.lessonLegacy },
      { userId: studentB.id, lessonId: IDS.lessonLegacy },
      { userId: teacher.id, lessonId: IDS.lessonLive },
      { userId: studentA.id, lessonId: IDS.lessonLive },
    ],
    skipDuplicates: true,
  });

  // 6) Units
  await prisma.lessonUnit.createMany({
    data: [
      {
        id: IDS.unitMaterial,
        moduleId: IDS.moduleBasics,
        title: "Что такое JavaScript",
        description: "Краткая теория + ссылки + мини-проверка",
        unitType: "MATERIAL",
        position: 0,
      },
      {
        id: IDS.unitLive,
        moduleId: IDS.moduleLive,
        lessonId: IDS.lessonLive,
        title: "Live-сессия с преподавателем",
        description: "Созвон в LiveKit + общая доска Excalidraw",
        unitType: "LIVE",
        position: 0,
      },
    ],
    skipDuplicates: true,
  });

  // 7) Material for MATERIAL unit
  await prisma.lessonMaterial.upsert({
    where: { unitId: IDS.unitMaterial },
    update: {
      content:
        "JavaScript — язык программирования для браузера и сервера. В этом блоке разберем переменные, типы и функции.",
      videoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
      contentJson: {
        blocks: [
          { type: "paragraph", text: "Переменные: let / const" },
          { type: "paragraph", text: "Типы данных: string, number, boolean" },
          { type: "paragraph", text: "Функции и стрелочный синтаксис" },
        ],
      },
    },
    create: {
      id: IDS.material,
      unitId: IDS.unitMaterial,
      content:
        "JavaScript — язык программирования для браузера и сервера. В этом блоке разберем переменные, типы и функции.",
      videoUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
      contentJson: {
        blocks: [
          { type: "paragraph", text: "Переменные: let / const" },
          { type: "paragraph", text: "Типы данных: string, number, boolean" },
          { type: "paragraph", text: "Функции и стрелочный синтаксис" },
        ],
      },
    },
  });

  // 8) Test + questions
  await prisma.test.upsert({
    where: { id: IDS.test },
    update: {
      title: "Быстрый тест по основам JS",
      description: "2 вопроса: один с выбором, один открытый",
      courseId: IDS.course,
      unitId: IDS.unitMaterial,
      lessonId: null,
      createdById: teacher.id,
      isPublished: true,
    },
    create: {
      id: IDS.test,
      title: "Быстрый тест по основам JS",
      description: "2 вопроса: один с выбором, один открытый",
      courseId: IDS.course,
      unitId: IDS.unitMaterial,
      createdById: teacher.id,
      isPublished: true,
    },
  });

  await prisma.testQuestion.deleteMany({
    where: { testId: IDS.test },
  });

  await prisma.testQuestion.create({
    data: {
      testId: IDS.test,
      question: "Как объявить переменную, которую нельзя переопределить?",
      type: "SINGLE",
      points: 1,
      position: 0,
      options: {
        create: [
          { text: "var", isCorrect: false, position: 0 },
          { text: "let", isCorrect: false, position: 1 },
          { text: "const", isCorrect: true, position: 2 },
        ],
      },
    },
  });

  await prisma.testQuestion.create({
    data: {
      testId: IDS.test,
      question: "Что выведет typeof 42 ?",
      type: "OPEN",
      points: 1,
      correctText: "number",
      position: 1,
    },
  });

  // 9) Homework
  await prisma.homework.upsert({
    where: { id: IDS.homework },
    update: {
      lessonId: IDS.lessonLive,
      courseId: IDS.course,
      authorId: teacher.id,
      title: "Домашка: мини-конспект",
      description:
        "Опишите 3 отличия let/const/var и приведите по одному примеру.",
      dueDate: DATES.homeworkDueAt,
    },
    create: {
      id: IDS.homework,
      lessonId: IDS.lessonLive,
      courseId: IDS.course,
      authorId: teacher.id,
      title: "Домашка: мини-конспект",
      description:
        "Опишите 3 отличия let/const/var и приведите по одному примеру.",
      dueDate: DATES.homeworkDueAt,
    },
  });

  // 10) Demo call + shared board
  await prisma.callSession.deleteMany({
    where: { id: IDS.call },
  });

  await prisma.callSession.create({
    data: {
      id: IDS.call,
      teacherId: teacher.id,
      studentId: studentA.id,
      inviteToken: TOKENS.callInvite,
      status: "SCHEDULED",
      topic: "Индивидуальный разбор домашки",
      scheduledAt: DATES.callScheduledAt,
      livekitRoomName: "seed-call-room-1",
    },
  });

  await prisma.boardDocument.upsert({
    where: {
      teacherId_studentId: {
        teacherId: teacher.id,
        studentId: studentA.id,
      },
    },
    update: {
      boardState: {
        elements: [],
        appState: { viewBackgroundColor: "#ffffff" },
        files: {},
      },
    },
    create: {
      teacherId: teacher.id,
      studentId: studentA.id,
      boardState: {
        elements: [],
        appState: { viewBackgroundColor: "#ffffff" },
        files: {},
      },
    },
  });

  console.log("✅ Seed completed.");
  console.log("Demo credentials (all users):");
  console.table([
    { role: "ADMIN", email: admin.email, password: DEMO_PASSWORD },
    { role: "TEACHER", email: teacher.email, password: DEMO_PASSWORD },
    { role: "STUDENT", email: studentA.email, password: DEMO_PASSWORD },
    { role: "STUDENT", email: studentB.email, password: DEMO_PASSWORD },
  ]);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
