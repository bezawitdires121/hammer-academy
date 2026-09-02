"use client";

import { useState } from "react";

export default function CreateUsersButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/employees/create-users", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error || "Failed to create users");
      } else {
        setMessage(`Created ${json.created.length} users`);
      }
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="rounded-lg bg-[#0f2a47] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Staff Logins"}
      </button>

      {message && <p className="mt-2 text-xs text-gray-700">{message}</p>}
    </div>
  );
}
