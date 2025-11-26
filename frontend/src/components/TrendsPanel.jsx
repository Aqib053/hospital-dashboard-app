import React from "react";

// Small helper to generate a simple SVG line chart per metric
function MetricRow({ name, series }) {
  if (!series || series.length === 0) return null;

  // order from oldest → newest
  const points = [...series].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const width = 220;
  const height = 50;
  const padding = 6;

  const norm = (v) => {
    if (max === min) return 0.5;
    return (v - min) / (max - min);
  };

  const svgPoints = points
    .map((p, idx) => {
      const x =
        padding +
        (idx * (width - 2 * padding)) /
          (points.length > 1 ? points.length - 1 : 1);
      const y =
        height - padding - norm(p.value) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(" ");

  const first = points[0].value;
  const last = points[points.length - 1].value;
  let trend = "Stable";
  if (last > first * 1.03) trend = "Rising";
  else if (last < first * 0.97) trend = "Falling";

  return (
    <div className="flex items-center justify-between border rounded-md bg-white px-3 py-2">
      <div className="mr-3">
        <div className="text-sm font-semibold text-gray-800">{name}</div>
        <div className="text-xs text-gray-500">
          Latest: {last} • {trend}
        </div>
      </div>

      <svg width={width} height={height}>
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          points={svgPoints}
        />
        {points.map((p, idx) => {
          const x =
            padding +
            (idx * (width - 2 * padding)) /
              (points.length > 1 ? points.length - 1 : 1);
          const y =
            height - padding - norm(p.value) * (height - 2 * padding);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={3}
              fill="#3b82f6"
              stroke="white"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function TrendsPanel({ summaries }) {
  // Build metric series from summaries
  const metricSeries = {};

  (summaries || []).forEach((s) => {
    if (!s.metrics) return;
    Object.entries(s.metrics).forEach(([key, value]) => {
      if (value == null) return;
      if (!metricSeries[key]) metricSeries[key] = [];
      metricSeries[key].push({
        value,
        createdAt: s.createdAt,
      });
    });
  });

  const metricKeys = Object.keys(metricSeries);

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-1">Health trends</h3>
      <p className="text-xs text-gray-500 mb-3">
        Based on values detected from uploaded lab reports (HbA1c, glucose,
        creatinine, etc.).
      </p>

      {metricKeys.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No numeric values detected yet. Upload more reports to see trends.
        </p>
      ) : (
        <div className="space-y-2">
          {metricKeys.map((key) => (
            <MetricRow key={key} name={key} series={metricSeries[key]} />
          ))}
        </div>
      )}
    </div>
  );
}
