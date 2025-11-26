import React, { useState } from "react";
import jsPDF from "jspdf";

export default function SummaryCard({ summary }) {
  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "full"

  if (!summary) {
    return (
      <div className="card h-[300px]">
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <p className="text-gray-500 text-sm">
          Upload a report to generate summary.
        </p>
      </div>
    );
  }

  const currentText =
    activeTab === "summary"
      ? summary.summary
      : summary.extracted_text || "Full text not available.";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentText || "");
      alert("Copied to clipboard");
    } catch {
      alert("Copy failed");
    }
  };

  const downloadText = () => {
    const blob = new Blob([currentText || ""], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix = activeTab === "summary" ? "-summary" : "-full";
    a.href = url;
    a.download = (summary.filename || "report") + suffix + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 40;
    const safe = (v) => (v ? String(v) : "");

    doc.setFontSize(16);
    doc.text("Hospital Report Summary", 40, y);
    y += 24;

    doc.setFontSize(11);
    if (summary.hospital) {
      doc.text(`Hospital: ${safe(summary.hospital)}`, 40, y);
      y += 14;
    }
    doc.text(`File: ${safe(summary.filename)}`, 40, y);
    y += 14;

    if (summary.createdAt) {
      doc.text(
        `Created: ${new Date(summary.createdAt).toLocaleString()}`,
        40,
        y
      );
      y += 16;
    }

    doc.text(
      `Mode: ${summary.used_ocr ? "OCR (scanned document)" : "Text PDF"}`,
      40,
      y
    );
    y += 22;

    const maxWidth = 515;
    const pageHeight = doc.internal.pageSize.getHeight();

    const addSection = (label, text) => {
      if (!text) return;
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 40;
      }
      doc.setFontSize(13);
      doc.text(label, 40, y);
      y += 18;

      doc.setFontSize(10);
      const lines = doc.splitTextToSize(safe(text), maxWidth);
      lines.forEach((line) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 40, y);
        y += 14;
      });
      y += 10;
    };

    addSection("AI Summary", summary.summary);
    addSection("Full report text", summary.extracted_text);

    const filename = (summary.filename || "report") + "-summary.pdf";
    doc.save(filename);
  };

  return (
    <div className="card h-[300px] flex flex-col">
      <h3 className="text-lg font-semibold mb-1">Summary</h3>

      <div className="mb-2 text-xs text-gray-600">
        <div>
          <span className="font-semibold">File:</span>{" "}
          {summary.filename || "—"}
        </div>
        {summary.createdAt && (
          <div>
            <span className="font-semibold">Created:</span>{" "}
            {new Date(summary.createdAt).toLocaleString()}
          </div>
        )}
        <div>
          <span className="font-semibold">Mode:</span>{" "}
          {summary.used_ocr ? "OCR (scanned document)" : "Text PDF"}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "summary"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700"
            }`}
          >
            AI Summary
          </button>
          <button
            onClick={() => setActiveTab("full")}
            className={`px-3 py-1 rounded-full border ${
              activeTab === "full"
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700"
            }`}
          >
            Full report text
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
          >
            Copy
          </button>
          <button
            onClick={downloadText}
            className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
          >
            Download .txt
          </button>
          <button
            onClick={downloadPdf}
            className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border rounded-md bg-gray-50 p-2 text-xs">
        <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {currentText}
        </pre>
      </div>
    </div>
  );
}
