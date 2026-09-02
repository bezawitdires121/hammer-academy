"use client";

import { useState } from "react";
import {
  createEmployeeAccount,
  regenerateEmployeeLoginId,
  toggleEmployeeActive,
  updateEmployee,
} from "../actions";

type Props = {
  employeeId: string;
  role: string;
  hasAccount: boolean;
  isActive: boolean;
  employeeLoginId: string | null;
  clubName: string | null;
  clubType: string | null;
};

const LOGIN_ROLES = [
  "TEACHER",
  "LIBRARIAN",
  "HEALTH",
] as const;

const ALL_ROLES = [
  "TEACHER",
  "LIBRARIAN",
  "HEALTH",
  "CLEANER",
  "SECURITY",
  "SECRETARY",
  "OTHER",
] as const;

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function EmployeeActions({
  employeeId,
  role,
  hasAccount,
  isActive,
  employeeLoginId,
  clubName,
  clubType,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<{
    loginId?: string;
    error?: string;
  }>({});

  const loginEnabled = LOGIN_ROLES.includes(
    role as (typeof LOGIN_ROLES)[number]
  );

  async function createAccount() {
    setLoading(true);
    setResult({});

    const formData = new FormData();
    formData.set("employeeId", employeeId);

    const response = await createEmployeeAccount(formData);

    setLoading(false);

    if (response.error) {
      setResult({
        error: response.error,
      });
      return;
    }

    setResult({
      loginId: response.loginId,
    });

    window.location.reload();
  }

  async function regenerateLogin() {
    setLoading(true);
    setResult({});

    const formData = new FormData();

    formData.set("employeeId", employeeId);
    formData.set(
      "reason",
      "Admin regenerated login credentials"
    );

    const response =
      await regenerateEmployeeLoginId(formData);

    setLoading(false);

    if (response.error) {
      setResult({
        error: response.error,
      });
      return;
    }

    setResult({
      loginId: response.loginId,
    });

    window.location.reload();
  }

  async function toggleActive() {
    setLoading(true);
    setResult({});

    const formData = new FormData();

    formData.set("employeeId", employeeId);
    formData.set(
      "isActive",
      isActive ? "false" : "true"
    );

    const response =
      await toggleEmployeeActive(formData);

    setLoading(false);

    if (response.error) {
      setResult({
        error: response.error,
      });
      return;
    }

    window.location.reload();
  }

  async function saveChanges(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setResult({});

    const formData = new FormData(
      event.currentTarget
    );

    formData.set("employeeId", employeeId);

    const selectedRole = formData.get("role");

    /*
     * An employee who already has a portal account
     * must remain in a login-enabled role.
     */
    if (
      hasAccount &&
      typeof selectedRole === "string" &&
      !LOGIN_ROLES.includes(
        selectedRole as (typeof LOGIN_ROLES)[number]
      )
    ) {
      setLoading(false);

      setResult({
        error:
          "This employee has a portal account and must remain Teacher, Librarian, or Health.",
      });

      return;
    }

    const response =
      await updateEmployee(formData);

    setLoading(false);

    if (response.error) {
      setResult({
        error: response.error,
      });
      return;
    }

    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* LOGIN ACCOUNT */}
      {loginEnabled && (
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Portal Account
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Manage this employee&apos;s portal access.
                </p>
              </div>

              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  hasAccount
                    ? isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {hasAccount
                  ? isActive
                    ? "Active"
                    : "Inactive"
                  : "No Account"}
              </span>
            </div>
          </div>

          <div className="p-6">
            {/* LOGIN ID */}
            {hasAccount && employeeLoginId && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Login ID
                </p>

                <p className="mt-1 font-mono text-lg font-bold text-[#0f2a47]">
                  {employeeLoginId}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  This ID is used for employee portal login.
                </p>
              </div>
            )}

            {/* NO ACCOUNT */}
            {!hasAccount && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="font-semibold text-blue-800">
                  No portal account
                </p>

                <p className="mt-1 text-sm text-blue-700">
                  This employee is eligible for a portal account
                  because their role is{" "}
                  <strong>{roleLabel(role)}</strong>.
                </p>
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-5 flex flex-wrap gap-3">
              {!hasAccount ? (
                <button
                  type="button"
                  onClick={createAccount}
                  disabled={loading}
                  className="rounded-lg bg-[#0f2a47] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b2138] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Creating..."
                    : "Create Login Account"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={regenerateLogin}
                    disabled={loading}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? "Regenerating..."
                      : "Regenerate Login ID"}
                  </button>

                  <button
                    type="button"
                    onClick={toggleActive}
                    disabled={loading}
                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive
                        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-green-700 text-white hover:bg-green-800"
                    }`}
                  >
                    {isActive
                      ? "Deactivate Account"
                      : "Activate Account"}
                  </button>
                </>
              )}
            </div>

            {/* ERROR */}
            {result.error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {result.error}
              </div>
            )}

            {/* NEW LOGIN ID */}
            {result.loginId && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-800">
                  Login ID updated
                </p>

                <p className="mt-2 text-sm text-green-700">
                  New Login ID:
                  <strong className="ml-2 font-mono">
                    {result.loginId}
                  </strong>
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ROLE & ASSIGNMENTS */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-semibold text-gray-900">
            Role & Assignments
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage the employee&apos;s main role and optional club
            assignment.
          </p>
        </div>

        <form
          onSubmit={saveChanges}
          className="p-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            {/* MAIN ROLE */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Main Role
              </label>

              <select
                name="role"
                defaultValue={role}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10 disabled:bg-gray-100"
              >
                {ALL_ROLES.map((option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {roleLabel(option)}
                    {LOGIN_ROLES.includes(
                      option as (typeof LOGIN_ROLES)[number]
                    )
                      ? " â€” Portal"
                      : " â€” No Portal"}
                  </option>
                ))}
              </select>

              {hasAccount && (
                <p className="mt-2 text-xs text-amber-600">
                  This employee already has a portal account, so
                  only portal-enabled roles can be selected.
                </p>
              )}
            </div>

            {/* CLUB */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Club Assignment
              </label>

              <input
                name="clubName"
                defaultValue={clubName ?? ""}
                disabled={loading}
                placeholder="Optional club assignment"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10 disabled:bg-gray-100"
              />

              <p className="mt-1.5 text-xs text-gray-500">
                Club assignment is separate from the employee&apos;s
                main role.
              </p>
            </div>

            {/* ROLE LEVEL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
               Role Level
              </label>

              <select
                name="clubType"
                defaultValue={clubType ?? ""}
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#0f2a47] focus:ring-2 focus:ring-[#0f2a47]/10 disabled:bg-gray-100"
              >
                <option value="">Not assigned</option>
                <option value="KG">KG</option>
                <option value="1-4">1–4</option>
                <option value="5-8">5–8</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          {/* SAVE */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-100 pt-5">
            <p className="text-xs text-gray-500">
              Changes are saved to the employee record.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-[#0f2a47] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0b2138] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

