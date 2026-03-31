import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export function hasAnyRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}

export async function requireRole(allowed: Role[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!hasAnyRole(user.role, allowed)) redirect("/dashboard");
  return user;
}
