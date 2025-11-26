import React from "react";

export default function HealthTrends({ summaries }) {
  if (!summaries || summaries.length === 0) {
    return (
      <div className="card mt-4">
        <h3 className="text-lg font-semibold mb-2">Health trends</h3>
        <p className="text-gray-500 text-sm">
          Upload multiple reports to see pattern changes.
        </p>
      </div>
    );
  }

  const metricsList = ["HbA1c", "FastingGlucose", "PPGlucose", "Creatinine"];

  const buildSeries = (key) =>
    summaries
      .map((s) =>
        s.metrics && s.metrics[key] != null
          ? { value: s.metrics[key], createdAt: s.createdAt }
          : null
      )
      .filter(Boolean);

  const describeTrend = (series) => {
    if (series.length < 2) return "Not enough data";
    const first = series[series.length - 1].value;
    const last = series[0].value;
    if (last > first + 0.2) return "Rising";
    if (last < first - 0.2) return "Falling";
    return "Stable";
  };

  const renderLine = (series) => {
    if (series.length < 2) return null;
    const values = series.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return (
      <div className="flex gap-1 mt-1">
        {series.map((p, idx) => {
          const norm =
            max === min ? 0.5 : (p.value - min) / (max - min); // 0..1
          return (
            <div
              key={idx}
              className="flex-1 h-1 rounded-full bg-blue-400"
              style={{ opacity: 0.4 + norm * 0.6 }}
            ></div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card mt-4">
      <h3 className="text-lg font-semibold mb-2">Health trends</h3>
      <p className="text-xs text-gray-500 mb-3">
        Based on values detected from uploaded reports (HbA1c, glucose,
        creatinine, etc.).
      </p>

      <div className="space-y-3">
        {metricsList.map((key) => {
          const series = buildSeries(key);
          if (!series.length) return null;
          const latest = series[0].value;
          const trend = describeTrend(series);

          return (
            <div key={key} className="border rounded-md px-3 py-2 text-xs">
              <div className="flex justify-between mb-1">
                <div className="font-semibold">{key}</div>
                <div>
                  Latest:{" "}
                  <span className="font-semibold">{latest}</span> • {trend}
                </div>
              </div>
              {renderLine(series)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
