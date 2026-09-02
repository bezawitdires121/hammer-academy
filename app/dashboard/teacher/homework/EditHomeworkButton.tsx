"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import EditHomeworkForm from "./EditHomeworkForm";

type Homework = {
  id: string;
  title: string;
  instructions: string | null;
  source: "TEXTBOOK" | "CLASSWORK" | "OTHER";
  textbookName: string | null;
  pageNumber: string | null;
  exercises: string | null;
  sourceNote: string | null;
  assignedDate: string;
  dueDate: string | null;
  sectionId: string;
  subjectId: string;
  semesterId: string | null;
};

type Assignment = {
  id: string;
  sectionId: string;
  subjectId: string;

  section: {
    id: string;
    label: string;

    grade: {
      level: number;
    };

    schoolYear: {
      label: string;
    };
  };

  subject: {
    id: string;
    name: string;
  };
};

export default function EditHomeworkButton({
  homework,
  assignments,
  isLocked = false,
}: {
  homework: Homework;
  assignments: Assignment[];
  isLocked?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isLocked}
        title={isLocked ? "This semester is locked." : "Edit homework"}
        className="inline-flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-brand-primary/40 hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-700"
      >
        <Pencil size={15} />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto my-8 w-full max-w-4xl bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Edit Homework
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Update the homework assignment.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <EditHomeworkForm
                homework={homework}
                assignments={assignments}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}









