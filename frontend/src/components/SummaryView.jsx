import React, { useState } from "react";
import jsPDF from "jspdf";

export default function SummaryView({ summary, loading }) {
  const [tab, setTab] = useState("summary"); // summary | full

  if (loading) {
    return (
      <div className="card h-[300px] flex items-center justify-center text-gray-600">
        Processing report… please wait.
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card h-[300px]">
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <p className="text-gray-500 text-sm">Upload a report to generate summary.</p>
      </div>
    );
  }

  const text =
    tab === "summary" ? summary.summary : summary.extracted_text || "No full text available.";

  /** 🔽 DOWNLOAD PDF */
  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 40;

    doc.setFontSize(16);
    doc.text("Hospital Report Summary", 40, y);
    y += 25;

    doc.setFontSize(11);
    doc.text(`File: ${summary.filename}`, 40, y);
    y += 15;

    if (summary.createdAt) {
      doc.text(`Date: ${new Date(summary.createdAt).toLocaleString()}`, 40, y);
      y += 18;
    }

    doc.text(`Mode: ${summary.used_ocr ? "OCR Extracted" : "Digital PDF"}`, 40, y);
    y += 22;

    const content = doc.splitTextToSize(text, 515);
    doc.text(content, 40, y);
    doc.save(`${summary.filename}-summary.pdf`);
  };

  return (
    <div className="card h-[300px] flex flex-col">
      <h3 className="text-lg font-semibold mb-1">Report Summary</h3>

      {/* ---------- TABS ---------- */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("summary")}
            className={`px-3 py-1 border rounded ${tab === "summary" ? "bg-blue-500 text-white" : ""}`}
          >
            AI Summary
          </button>

          <button
            onClick={() => setTab("full")}
            className={`px-3 py-1 border rounded ${tab === "full" ? "bg-blue-500 text-white" : ""}`}
          >
            Full Text
          </button>
        </div>

        <button
          onClick={downloadPdf}
          className="px-3 py-1 border rounded bg-white hover:bg-gray-100 text-xs"
        >
          Download PDF
        </button>
      </div>

      {/* ---------- CONTENT ---------- */}
      <div className="flex-1 overflow-y-auto bg-gray-50 border p-2 rounded text-xs leading-relaxed">
        {text}
      </div>
    </div>
  );
}
