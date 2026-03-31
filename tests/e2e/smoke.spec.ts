import { test, expect } from "@playwright/test";

async function registerStudentByApi(
  request: import("@playwright/test").APIRequestContext,
  params: { name: string; email: string; password: string },
) {
  const res = await request.post("/api/auth/register", { data: params });
  expect(res.ok()).toBeTruthy();
}

test("landing page is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SkillSpace School")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Перейти в каталог" }),
  ).toBeVisible();
});

test("auth pages open", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Вход в SkillSpace School" }),
  ).toBeVisible();

  await page.goto("/register");
  await expect(
    page.getByRole("heading", { name: "Регистрация" }),
  ).toBeVisible();
});

test("student can access calls page but cannot create calls", async ({
  page,
  context,
}) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const studentEmail = `student-${stamp}@example.com`;
  const password = "password123";

  await registerStudentByApi(context.request, {
    name: "Student",
    email: studentEmail,
    password,
  });

  const loginRes = await context.request.post("/api/auth/login", {
    data: { email: studentEmail, password },
  });
  expect(loginRes.ok()).toBeTruthy();

  await page.goto("/calls");
  await expect(page.getByRole("heading", { name: "Звонки" })).toBeVisible();
  await expect(page.getByText("Новый звонок")).toHaveCount(0);
});
