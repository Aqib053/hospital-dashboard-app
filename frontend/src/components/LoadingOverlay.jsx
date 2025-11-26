import React from "react";

export default function LoadingOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg px-6 py-4 text-center">
        <div className="mb-2 animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <div className="font-semibold text-sm">Processing…</div>
        <div className="text-xs text-gray-500">
          Extracting text &amp; generating summary
        </div>
      </div>
    </div>
  );
}
