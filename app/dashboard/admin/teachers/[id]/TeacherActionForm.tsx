"use client";

import { useActionState } from "react";

type ActionState = {
  error: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
};

export default function TeacherActionForm({
  action,
  children,
  className,
}: Props) {
  const [state, formAction, pending] = useActionState(
    async (_previousState: ActionState, formData: FormData) => {
      try {
        await action(formData);

        return { error: null };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        };
      }
    },
    { error: null }
  );

  return (
    <form action={formAction} className={className}>
      {children}

      {state.error && (
        <div className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
          {state.error}
        </div>
      )}

      {pending && (
        <div className="mt-2 text-xs text-slate-400">
          Saving...
        </div>
      )}
    </form>
  );
}
