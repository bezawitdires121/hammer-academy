"use client";

export default function RosterActions({
  isYearLocked,
}: {
  isYearLocked: boolean;
}) {
  function printReportCards() {
    const printContent = document.querySelector(
      ".print-only"
    ) as HTMLElement | null;

    if (!printContent) {
      alert("Report cards are not ready for printing.");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=700"
    );

    if (!printWindow) {
      alert(
        "Please allow pop-ups for this site, then try again."
      );
      return;
    }

    const styles = Array.from(
      document.querySelectorAll("style")
    )
      .map((style) => style.innerHTML)
      .join("\n");

    printWindow.document.open();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Student Report Cards</title>

          <style>
            ${styles}

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            body {
              width: 210mm;
            }

            .print-only {
              display: block !important;
              width: 210mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .screen-only {
              display: none !important;
            }

            @page {
              size: A4 portrait;
              margin: 0;
            }

            /*
             * EVERY REPORT PAGE IS ONE A4 SHEET.
             */
            .report-page {
              width: 210mm !important;
              height: 297mm !important;

              min-width: 210mm !important;
              max-width: 210mm !important;

              min-height: 297mm !important;
              max-height: 297mm !important;

              box-sizing: border-box !important;

              margin: 0 !important;
              padding: 15mm 16mm !important;

              overflow: hidden !important;

              background: white !important;
              color: black !important;

              page-break-before: always !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;

              break-before: page !important;
              break-after: page !important;
              break-inside: avoid !important;
            }

            /*
             * FIRST REPORT PAGE STARTS AT PAGE 1.
             */
            .report-page:first-child {
              page-break-before: auto !important;
              break-before: auto !important;
            }

            /*
             * EVERY REPORT PAGE AFTER THE FIRST
             * STARTS ON A NEW SHEET.
             */
            .report-page + .report-page {
              page-break-before: always !important;
              break-before: page !important;
            }

            /*
             * Don't create an extra blank sheet after
             * the final student's back page.
             */
            .report-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            /*
             * Prevent tables/content from forcing pages
             * to split.
             */
            table {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            img {
              max-width: 100%;
            }
          </style>
        </head>

        <body>
          ${printContent.outerHTML}

          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 500);
            };

            window.onafterprint = function () {
              setTimeout(function () {
                window.close();
              }, 200);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <button
      type="button"
      onClick={printReportCards}
      disabled={isYearLocked}
      title={
        isYearLocked
          ? "This school year is locked."
          : "Print all report cards"
      }
      className="inline-flex items-center justify-center rounded-xl bg-[#0f2a47] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#173b61]"
    >
      Print All Report Cards
    </button>
  );
}

