import React from "react";

export default function DoctorsCorner({ summaries }) {
  const now = new Date();
  const last24 = (summaries || []).filter((s) => {
    const d = new Date(s.createdAt || s.created_at || now);
    const diffHrs = (now - d) / (1000 * 60 * 60);
    return diffHrs <= 24;
  });

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Doctor&apos;s corner</h3>
      <p className="text-[11px] text-gray-500 mb-3">
        Quick overview of reports from the last 24 hours. Prototype for shift
        handover; not a complete inpatient list.
      </p>

      {last24.length === 0 ? (
        <p className="text-xs text-gray-500">
          No reports uploaded in the last 24 hours for this hospital.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
          {last24.map((item) => {
            const t = new Date(item.createdAt || item.created_at || Date.now());
            const firstLine =
              (item.summary || item.extracted_text || "")
                .split("\n")
                .find((l) => l.trim().length > 0) || "No summary text.";
            return (
              <div
                key={item.id}
                className="border rounded-md bg-gray-50 px-3 py-2 flex flex-col gap-1"
              >
                <div className="flex justify-between">
                  <span className="font-medium truncate max-w-[60%]">
                    {item.filename || "Report"}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {t.toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-[11px] text-gray-700 line-clamp-2">
                  {firstLine}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
