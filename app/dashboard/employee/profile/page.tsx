import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function EmployeeProfilePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });

  if (!employee) {
    return <div className="p-6">No staff profile found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-2xl bg-brand-primary p-6 text-white shadow-lg">
        <p className="text-sm text-white/70">Staff profile</p>
        <h1 className="mt-1 text-2xl font-bold">{employee.fullName}</h1>
        <p className="mt-1 text-sm text-white/80">{employee.role}</p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoRow label="Full name" value={employee.fullName} />
          <InfoRow label="Role" value={employee.role} />
          <InfoRow label="Club / unit" value={employee.clubName ?? 'General'} />
          <InfoRow label="Club type" value={employee.clubType ?? 'School support'} />
        </div>
      </section>

      <div className="flex gap-3">
        <Link href="/dashboard/employee" className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white">Back to dashboard</Link>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
