import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "./logout-action";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <span className="font-semibold text-gray-900">Hammer Academy</span>
          <span className="ml-3 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {session.user.role}
          </span>
        </div>
        <a href="/dashboard/announcements" className="text-sm text-gray-600 hover:text-gray-900 mr-4">
          Announcements
        </a>
        <a href="/dashboard/issues" className="text-sm text-gray-600 hover:text-gray-900 mr-4">
          Issues
        </a>
        <form action={logoutAction}>
          <button className="text-sm text-gray-600 hover:text-gray-900">
            Sign out
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}