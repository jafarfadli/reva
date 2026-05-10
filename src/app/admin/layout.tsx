import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";
import AuthButton from "@/components/AuthButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-green-700 hover:underline flex items-center gap-1"
            >
              ← Home
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/admin" className="text-2xl font-bold text-gray-900">
              Reva
            </Link>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-semibold">
              ADMIN
            </span>
          </div>
          <AuthButton />
        </div>
        <nav className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            <AdminTab href="/admin" label="Reservasi" />
            <AdminTab href="/admin/walk-in" label="Walk-in" />
            <AdminTab href="/admin/layout" label="Layout Meja" />
          </div>
        </nav>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-6">{children}</div>
    </div>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-green-700 border-b-2 border-transparent hover:border-green-500 -mb-px"
    >
      {label}
    </Link>
  );
}