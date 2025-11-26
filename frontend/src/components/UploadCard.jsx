import React, { useState } from "react";

const API_BASE = "https://hospital-backend-iqva.onrender.com";

export default function UploadCard({ hospital, onNewSummary, setLoading }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [currentFileName, setCurrentFileName] = useState("none selected");

  const upload = async () => {
    console.log("UPLOAD button clicked");

    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    setError(null);

    if (typeof setLoading === "function") {
      setLoading(true);
      console.log("setLoading(true) called");
    }

    try {
      const form = new FormData();
      form.append("pdf", file);
      form.append("hospital_name", hospital);

      console.log("Sending fetch to backend…");
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: form,
      });

      console.log("Response received. Status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("Server error:", res.status, text);
        throw new Error(`Server error ${res.status}`);
      }

      const data = await res.json();
      console.log("Parsed JSON from backend:", data);

      if (typeof onNewSummary === "function") {
        onNewSummary(hospital, data);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err.message || "Upload failed. Check backend.");
    } finally {
      if (typeof setLoading === "function") {
        setLoading(false);
        console.log("setLoading(false) called");
      }
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Upload Report</h3>

      <div className="border border-dashed rounded-md h-20 flex items-center justify-center text-xs text-gray-500 mb-3 bg-gray-50">
        <span className="font-medium mr-1">Drag &amp; drop</span>a PDF/image here,
        or click below to browse.
        <div className="mt-1 w-full text-center text-[11px] text-gray-400">
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
        className="text-xs mb-2"
      />

      <button onClick={upload} className="btn-primary w-full">
        Upload &amp; Summarize
      </button>

      {error && (
        <p className="text-xs text-red-600 mt-2">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        PDF / PNG / JPG supported (OCR active for scanned reports).
      </p>
    </div>
  );
}
