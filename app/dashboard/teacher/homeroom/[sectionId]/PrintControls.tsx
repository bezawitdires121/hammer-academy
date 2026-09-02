"use client";

export default function PrintControls() {
  function printReportCards() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={printReportCards}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Print Report Cards
      </button>
    </div>
  );
}