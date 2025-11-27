import React, { useState } from "react";

export default function UploadCard({ hospital, onNewSummary, setLoading }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [currentFileName, setCurrentFileName] = useState("none selected");

  const upload = async () => {
    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    setError(null);
    if (typeof setLoading === "function") setLoading(true);

    try {
      const form = new FormData();
      form.append("pdf", file);
      form.append("hospital_name", hospital);

      const res = await fetch("https://hospital-backend-iqva.onrender.com/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Server error:", res.status, text);
        throw new Error("Upload failed. Please try again.");
      }

      const data = await res.json();
      if (typeof onNewSummary === "function") {
        onNewSummary(hospital, data);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message || "Upload failed. Check backend.");
    } finally {
      if (typeof setLoading === "function") setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-lg border">
      <h3 className="text-lg font-semibold mb-2">Upload Report</h3>

      <div className="border border-dashed rounded-md p-3 sm:p-4 text-xs text-gray-600 mb-3 bg-gray-50">
        <span className="font-medium">Drag &amp; drop</span> a PDF/image here, or
        click below to browse.
        <div className="text-[11px] mt-1 text-gray-400">
          Current file: {currentFileName}
        </div>
      </div>

      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={(e) => {
          const f = e.target.files[0];
          setFile(f || null);
          setCurrentFileName(f ? f.name : "none selected");
        }}
        className="text-xs mb-3"
      />

      {/* SUPER OBVIOUS SHIMMER BUTTON */}
      <button
        onClick={upload}
        className="relative w-full inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0) 80%)",
            transform: "translateX(-120%)",
            animation: "shimmer-sweep 1.4s infinite",
            mixBlendMode: "screen",
          }}
        />
        <span className="relative">Upload &amp; Summarize</span>

        <style>{`
          @keyframes shimmer-sweep {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(120%); }
          }
        `}</style>
      </button>

      {error && (
        <p className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}

      <p className="text-[11px] text-gray-500 mt-2">
        PDF / PNG / JPG supported (OCR active for scanned reports).
      </p>
    </div>
  );
}
