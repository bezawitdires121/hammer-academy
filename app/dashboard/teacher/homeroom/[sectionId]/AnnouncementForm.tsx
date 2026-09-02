"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHomeroomAnnouncement } from "./actions";
import { Megaphone, Send, X } from "lucide-react";

type Props = {
  sectionId: string;
  sectionName: string;
  isLocked: boolean;
};

export default function AnnouncementForm({
  sectionId,
  sectionName,
  isLocked,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const result = await createHomeroomAnnouncement(
      sectionId,
      formData
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }

    event.currentTarget.reset();
    setOpen(false);

    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isLocked}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-hover"
      >
        <Megaphone size={17} />
        New Announcement
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 p-5">
        <div>
          <h3 className="font-bold text-slate-900">
            New Announcement
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            This announcement will be published to {sectionName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-5"
      >
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="announcement-title"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Title
          </label>

          <input
            id="announcement-title"
            name="title"
            type="text"
            required
            disabled={isLocked}
             placeholder="Enter announcement title"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
          />
        </div>

        <div>
          <label
            htmlFor="announcement-body"
            className="mb-1.5 block text-sm font-semibold text-slate-700"
          >
            Message
          </label>

          <textarea
            id="announcement-body"
            name="body"
            required
            disabled={isLocked}
             rows={6}
            placeholder="Write your announcement..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || isLocked}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} />

            {loading ? "Publishing..." : "Publish Announcement"}
          </button>
        </div>
      </form>
    </div>
  );
}




