"use client";

import { useEffect } from "react";

type Props = {
  message: string | null;
  type?: "success" | "error";
  onClose: () => void;
};

export default function Toast({
  message,
  type = "success",
  onClose,
}: Props) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(onClose, 3500);

    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed right-5 top-5 z-[100]">
      <div
        className={`flex min-w-[280px] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          type === "success"
            ? "border-green-200 bg-white text-green-800"
            : "border-red-200 bg-white text-red-800"
        }`}
      >
        <div
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {type === "success" ? "✓" : "!"}
        </div>

        <p className="flex-1 text-sm font-medium">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="text-lg leading-none text-gray-400 hover:text-gray-700"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
