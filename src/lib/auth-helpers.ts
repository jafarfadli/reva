import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Pastikan user yang sedang login adalah ADMIN.
 * Redirect ke / kalau bukan admin atau belum login.
 * Return session.user kalau sukses (TS-narrow ke non-null).
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }
  return session.user;
}