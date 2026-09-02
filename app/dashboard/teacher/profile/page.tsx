import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function TeacherProfilePage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    include: {
      user: true,
    },
  });

  if (!teacher) {
    redirect("/dashboard/teacher");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your account and personal information.
        </p>
      </div>

      <ProfileForm
        profile={{
          fullName: teacher.fullName,
          email: teacher.user.email ?? "",
          phone: teacher.user.phone ?? "",
          photoUrl: teacher.photoUrl,
          signatureUrl: teacher.signatureUrl,
        }}
      />
    </div>
  );
}