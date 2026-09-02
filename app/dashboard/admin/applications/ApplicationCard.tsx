"use client";

import { useState, useTransition } from "react";
import { acceptApplication, rejectApplication } from "./actions";

type Application = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  requestedRole?: string | null;
  photoUrl: string | null;
  createdAt: Date;
};

export default function ApplicationCard({
  application,
}: {
  application: Application;
}) {
  const [mode, setMode] = useState<"view" | "accept" | "reject" | "done">("view");
  const [reason, setReason] = useState("");
  
  const [libraryLevel, setLibraryLevel] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    const formData = new FormData();
    formData.set("applicationId", application.id);
    
    if (application.requestedRole === "LIBRARIAN") {
      if (libraryLevel) formData.set("clubType", libraryLevel);
    }

    startTransition(async () => {
      const result = await acceptApplication(formData);

      if (result?.error) {
        setError(result.error);
      } else {
        setMode("done");
      }
    });
  }

  function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    const formData = new FormData();
    formData.set("applicationId", application.id);
    formData.set("reason", reason);

    startTransition(async () => {
      const result = await rejectApplication(formData);

      if (result?.error) {
        setError(result.error);
      } else {
        setMode("done");
      }
    });
  }

  if (mode === "done") return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {application.photoUrl ? (
          <img
            src={application.photoUrl}
            alt={application.fullName}
            className="h-16 w-16 rounded-full border-2 border-brand-accent/30 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-lg font-bold text-white">
            {application.fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {application.fullName}
          </h3>

            <p className="text-sm text-gray-500">Role: {application.requestedRole ?? 'Teacher'}</p>

          <p className="text-sm text-gray-500">
            {application.email}
          </p>

          <p className="text-sm text-gray-500">
            {application.phone || "No phone number provided"}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Applied{" "}
            {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-danger">
          {error}
        </p>
      )}

      {mode === "view" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setMode("accept")}
            className="rounded-lg bg-brand-success px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Accept
          </button>

          <button
            onClick={() => setMode("reject")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Reject
          </button>
        </div>
      )}

      {mode === "accept" && (
        <form
          onSubmit={handleAccept}
          className="mt-4 space-y-3 border-t border-gray-100 pt-4"
        >
          

          
          {application.requestedRole === "LIBRARIAN" && (
            <div className="mt-2 grid gap-2">
              <label className="text-sm font-medium">Library Level</label>
              <select value={libraryLevel ?? ""} onChange={(e) => setLibraryLevel(e.target.value || null)} className="rounded-md border px-3 py-2">
                <option value="">-- Select --</option>
                <option value="KG 1-4">KG 1-4</option>
                <option value="5-8">5-8</option>
                <option value="9-12">9-12</option>
                <option value="ALL">All Grades</option>
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <button
              disabled={isPending}
              className="rounded-lg bg-brand-success px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Accepting..." : "Confirm Accept"}
            </button>

            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm text-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form
          onSubmit={handleReject}
          className="mt-4 space-y-3 border-t border-gray-100 pt-4"
        >
          <label className="block text-sm font-medium text-gray-700">
            Reason for rejection
          </label>

          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Enter reason"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
          />

          <div className="flex gap-2">
            <button
              disabled={isPending}
              className="rounded-lg bg-brand-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Rejecting..." : "Confirm Reject"}
            </button>

            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm text-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}