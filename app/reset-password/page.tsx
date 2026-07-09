"use client";

import { useState } from "react";
import { requestPasswordReset, verifyOtpAndReset } from "./actions";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);
    const formData = new FormData();
    formData.set("phone", phone);
    const result = await requestPasswordReset(formData);
    setIsPending(false);
    if ("message" in result && result.message) {
      setMessage(result.message);
    }
    setStep("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);
    const formData = new FormData();
    formData.set("phone", phone);
    formData.set("code", code);
    formData.set("newPassword", newPassword);
    const result = await verifyOtpAndReset(formData);
    setIsPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Reset Password</h1>

        {success ? (
          <div className="space-y-3">
            <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
              Password updated successfully.
            </p>
            <a href="/login" className="block text-center text-sm text-slate-800 underline">
              Go to login
            </a>
          </div>
        ) : step === "request" ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            {message && (
              <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09XXXXXXXX"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <button
              disabled={isPending}
              className="w-full rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {isPending ? "Sending..." : "Send Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            {message && (
              <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 tracking-widest"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <button
              disabled={isPending}
              className="w-full rounded bg-slate-800 px-4 py-2 text-white disabled:opacity-50"
            >
              {isPending ? "Verifying..." : "Reset Password"}
            </button>
          </form>
        )}

        <a href="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">
          Back to login
        </a>
      </div>
    </div>
  );
}