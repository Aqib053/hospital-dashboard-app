import React, { useState } from "react";

export default function SummaryCard({ summary }) {
  const [activeTab, setActiveTab] = useState("ai"); // "ai" | "full"
  const [copyStatus, setCopyStatus] = useState("");

  if (!summary) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <p className="text-sm text-gray-500">
          Upload a report to generate summary.
        </p>
      </div>
    );
  }

  const createdDate = new Date(summary.createdAt || summary.created_at || Date.now());

  const aiText = summary.summary || "";
  const fullText = summary.extracted_text || aiText;

  const currentText = activeTab === "ai" ? aiText : fullText;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentText || "");
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
      setCopyStatus("Copy failed");
      setTimeout(() => setCopyStatus(""), 1500);
    }
  };

  const downloadTextFile = (ext = "txt") => {
    const blob = new Blob([currentText || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const baseName = summary.filename || "report";

    a.href = url;
    a.download = `${baseName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-2">Summary</h3>

      {/* Meta info */}
      <div className="text-xs text-gray-600 mb-3 space-y-0.5">
        <div>
          <span className="font-semibold">File:</span>{" "}
          {summary.filename || "Report"}
        </div>
        <div>
          <span className="font-semibold">Created:</span>{" "}
          {createdDate.toLocaleString()}
        </div>
        <div>
          <span className="font-semibold">Mode:</span>{" "}
          {summary.used_ocr ? "Scanned PDF (OCR)" : "Text PDF"}
        </div>
      </div>

      {/* Tabs + actions */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex rounded-full bg-gray-100 p-1 text-xs">
          <button
            onClick={() => setActiveTab("ai")}
            className={`px-3 py-1 rounded-full ${
              activeTab === "ai"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700"
            }`}
          >
            AI Summary
          </button>
          <button
            onClick={() => setActiveTab("full")}
            className={`px-3 py-1 rounded-full ${
              activeTab === "full"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-700"
            }`}
          >
            Full report text
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={handleCopy}
            className="px-3 py-1 rounded-full border bg-white hover:bg-gray-50"
          >
            Copy
          </button>
          <button
            onClick={() => downloadTextFile("txt")}
            className="px-3 py-1 rounded-full border bg-white hover:bg-gray-50"
          >
            Download .txt
          </button>
          <button
            onClick={() => downloadTextFile("pdf")}
            className="px-3 py-1 rounded-full border bg-white hover:bg-gray-50"
          >
            Download PDF
          </button>
        </div>
      </div>

      {copyStatus && (
        <div className="text-[11px] text-green-600 mb-2">{copyStatus}</div>
      )}

      {/* Text area */}
      <div className="flex-1 min-h-[160px] max-h-80 overflow-y-auto text-xs md:text-sm bg-gray-50 rounded-md border px-3 py-2 whitespace-pre-wrap leading-relaxed">
        {currentText || "No text available for this report."}
      </div>
    </div>
  );
}
