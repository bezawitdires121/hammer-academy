"use client";

import { useState, useTransition } from "react";
import { toggleUserActive } from "./actions";

export default function ActiveToggle({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  const [active, setActive] = useState(isActive);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function handleToggle() {
    setError(undefined);
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("isActive", (!active).toString());

    startTransition(async () => {
      const result = await toggleUserActive(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setActive(!active);
      }
    });
  }

  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${
          active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {isPending ? "..." : active ? "Active" : "Deactivated"}
      </button>
    </span>
  );
}