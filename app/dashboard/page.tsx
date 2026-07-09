import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirect() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  const role = session.user.role;

  if (role === "ADMIN") redirect("/dashboard/admin");
  if (role === "TEACHER") redirect("/dashboard/teacher");
  if (role === "PARENT") redirect("/dashboard/parent");

  redirect("/login");
}