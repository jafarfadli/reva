import Image from "next/image";
import { auth, signIn, signOut } from "@/auth";

export default async function AuthButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-white border rounded hover:bg-gray-50 flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {session.user.role !== "ADMIN" && (
        <a        
          href="/my-reservations"
          className="text-sm text-gray-700 hover:text-green-700 hover:underline"
        >
          Reservasi saya
        </a>
      )}
      {session.user.role === "ADMIN" && (
        <a
          href="/admin"
          className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
        >
          Admin
        </a>
      )}
      <div className="text-sm text-right">
        <div className="font-medium text-gray-900">{session.user.name}</div>
        <div className="text-xs text-gray-500">
          {session.user.email}
          {session.user.role === "ADMIN" && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">
              ADMIN
            </span>
          )}
        </div>
      </div>
      {session.user.image && (
        <Image
          src={session.user.image}
          alt=""
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}