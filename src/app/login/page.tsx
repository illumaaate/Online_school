import Link from "next/link";
import { LoginForm } from "@/features/auth/ui/LoginForm";

export default function LoginPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="skillhub-hero rounded-[2rem] p-8 md:p-10">
        <p className="skillhub-kicker text-xs font-semibold text-[var(--accent)]">
          Identity
        </p>
        <h1 className="mt-3 text-3xl font-semibold">SkillHub</h1>
        <p className="mt-4 max-w-md text-sm text-white/80">
          Образовательная платформа: тёмные поверхности, акцентный оранжевый и
          ясная навигация по учебному пути.
        </p>
      </div>

      <div className="space-y-4">
        <LoginForm />
        <p className="text-center text-sm text-[var(--muted)]">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="font-medium text-black underline decoration-[var(--accent)] underline-offset-4"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </section>
  );
}
