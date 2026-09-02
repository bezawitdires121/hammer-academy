"use client";

export default function CertificatePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="screen-only inline-flex items-center justify-center rounded-xl bg-[#0f2a47] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173b61]"
    >
      Print Certificate
    </button>
  );
}