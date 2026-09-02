"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-xl bg-[#0f2a47] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2037]"
    >
      🖨 Print Sheet
    </button>
  );
}