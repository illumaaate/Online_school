import Link from "next/link";
import { RegisterForm } from "@/features/auth/ui/RegisterForm";

export default function RegisterPage() {
  return (
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <RegisterForm />
        <p className="text-center text-sm text-[var(--muted)]">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-black underline decoration-[var(--accent)] underline-offset-4"
          >
            Войти
          </Link>
        </p>
      </div>

      <div className="skillhub-hero rounded-[2rem] p-8 md:p-10">
        <p className="skillhub-kicker text-xs font-semibold text-[var(--accent)]">
          Start
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Подключайтесь к обучению</h1>
        <p className="mt-4 max-w-md text-sm text-white/80">
          После регистрации вы получите доступ к каталогу программ, учебным
          материалам, тестам и live-сессиям в SkillHub.
        </p>
      </div>
    </section>
  );
}
