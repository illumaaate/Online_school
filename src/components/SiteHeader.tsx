import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/90 backdrop-blur-xl">
      <div className="h-1 w-full bg-[var(--accent)]" />
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-[var(--accent)] text-lg font-bold text-black">
            S
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold text-black">
              SkillHub
            </span>
            <span className="block text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
              Онлайн Школа
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm text-[var(--muted)] md:gap-3">
          <Link
            href="/courses"
            className="rounded-full px-3 py-2 hover:bg-[var(--accent-soft)] hover:text-black"
          >
            Курсы
          </Link>
          {user ? (
            <Link
              href="/calls"
              className="rounded-full px-3 py-2 hover:bg-[var(--accent-soft)] hover:text-black"
            >
              Звонки
            </Link>
          ) : null}
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-2 hover:bg-[var(--accent-soft)] hover:text-black"
            >
              Кабинет
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-3 py-2 hover:bg-[var(--accent-soft)] hover:text-black"
            >
              Войти
            </Link>
          )}
          {user ? <LogoutButton /> : null}
          {!user ? (
            <Link
              href="/register"
              className="rounded-full border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-medium text-black hover:bg-[var(--accent-strong)] hover:text-white"
            >
              Регистрация
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
