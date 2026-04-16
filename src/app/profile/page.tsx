import { requireUser } from "@/lib/auth";
import { ProfileClient } from "@/features/profile/ui/ProfileClient";

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <section className="space-y-5">
      <div className="skillhub-hero rounded-[2rem] p-7">
        <p className="skillhub-kicker text-xs font-semibold">Профиль</p>
        <h1 className="mt-3 text-2xl font-semibold">Настройки аккаунта</h1>
        <p className="mt-2 text-sm text-white/80">
          {user.name} · {user.email} · {user.role}
        </p>
      </div>

      <ProfileClient
        initialName={user.name}
        email={user.email}
        role={user.role}
      />
    </section>
  );
}
