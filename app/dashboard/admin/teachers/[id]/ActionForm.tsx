"use client";

import { useActionState } from "react";

type ActionResult = {
  error?: string;
  success?: boolean;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
};

export default function ActionForm({
  action,
  children,
  className,
}: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult, formData: FormData): Promise<ActionResult> => {
      try {
        await action(formData);

        return {
          success: true,
        };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Something went wrong. Please try again.",
        };
      }
    },
    {}
  );

  return (
    <form action={formAction} className={className}>
      {state.error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {state.error}
        </div>
      )}

      {children}

      {pending && (
        <p className="mt-2 text-xs font-medium text-slate-400">
          Saving...
        </p>
      )}
    </form>
  );
}
