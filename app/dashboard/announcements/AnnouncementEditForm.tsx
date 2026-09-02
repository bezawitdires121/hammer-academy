"use client";

import { useActionState } from "react";
import { CheckCircle2, Save, TriangleAlert } from "lucide-react";
import { updateAnnouncement } from "./actions";

type FormState = {
  error: string | undefined;
  success: boolean;
};

type AnnouncementEditFormProps = {
  announcement: {
    id: string;
    title: string;
    body: string;
    priority: boolean;
  };
};

const initialState: FormState = {
  error: undefined,
  success: false,
};

export default function AnnouncementEditForm({
  announcement,
}: AnnouncementEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (
      _prevState: FormState,
      formData: FormData
    ): Promise<FormState> => {
      const result = await updateAnnouncement(formData);

      return {
        error: result?.error,
        success: !!result?.success,
      };
    },
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="announcementId"
        value={announcement.id}
      />

      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{state.error}</p>
        </div>
      )}

      {state.success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Announcement updated successfully.</p>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor={`edit-title-${announcement.id}`}
          className="text-sm font-semibold text-slate-800"
        >
          Title
        </label>

        <input
          id={`edit-title-${announcement.id}`}
          name="title"
          defaultValue={announcement.title}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor={`edit-body-${announcement.id}`}
          className="text-sm font-semibold text-slate-800"
        >
          Message
        </label>

        <textarea
          id={`edit-body-${announcement.id}`}
          name="body"
          defaultValue={announcement.body}
          required
          rows={5}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50">
        <input
          type="checkbox"
          name="priority"
          defaultChecked={announcement.priority}
          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
        />

        <div>
          <p className="text-sm font-medium text-slate-800">
            Mark as priority
          </p>

          <p className="text-xs text-slate-500">
            Use for urgent or important notices.
          </p>
        </div>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-4 w-4" />

        {isPending ? "Saving changes..." : "Save Changes"}
      </button>
    </form>
  );
}
