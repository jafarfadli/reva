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
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-border-warm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-mocha hover:text-terracotta transition flex items-center gap-1"
            >
              ← Home
            </Link>
            <span className="text-border-warm">|</span>
            <Link
              href="/admin"
              className="font-serif text-2xl font-semibold text-espresso tracking-tight"
            >
              Reva
            </Link>
            <span className="text-xs px-2 py-0.5 bg-terracotta-subtle text-terracotta-dark rounded font-semibold tracking-wide uppercase">
              Admin
            </span>
          </div>
          <AuthButton />
        </div>
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            <AdminTab href="/admin" label="Reservasi" />
            <AdminTab href="/admin/walk-in" label="Walk-in" />
            <AdminTab href="/admin/layout" label="Layout Meja" />
          </div>
        </nav>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}

function AdminTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-3 text-sm font-medium text-mocha hover:text-terracotta border-b-2 border-transparent hover:border-terracotta transition -mb-px"
    >
      {label}
    </Link>
  );
}