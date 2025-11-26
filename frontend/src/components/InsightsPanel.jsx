import React from "react";

function buildInsights(metrics) {
  if (!metrics) return [];

  const insights = [];

  if (metrics.HbA1c != null) {
    const v = metrics.HbA1c;
    if (v >= 6.5) {
      insights.push({
        level: "high",
        title: "Diabetes-range HbA1c",
        text: `HbA1c is ${v}. This is in the diabetes range (≥ 6.5%).`,
      });
    } else if (v >= 5.7) {
      insights.push({
        level: "warning",
        title: "Prediabetes-range HbA1c",
        text: `HbA1c is ${v}. This is in the prediabetes range (5.7–6.4%).`,
      });
    } else {
      insights.push({
        level: "ok",
        title: "HbA1c in normal range",
        text: `HbA1c is ${v}. This is within the normal range (< 5.7%).`,
      });
    }
  }

  if (metrics.FastingGlucose != null) {
    const v = metrics.FastingGlucose;
    if (v >= 126) {
      insights.push({
        level: "high",
        title: "High fasting glucose",
        text: `Fasting plasma glucose is ${v} mg/dL (≥ 126 mg/dL suggests diabetes).`,
      });
    } else if (v >= 100) {
      insights.push({
        level: "warning",
        title: "Impaired fasting glucose",
        text: `Fasting glucose is ${v} mg/dL (100–125 mg/dL = prediabetes range).`,
      });
    } else {
      insights.push({
        level: "ok",
        title: "Fasting glucose in normal range",
        text: `Fasting glucose is ${v} mg/dL (normal < 100 mg/dL).`,
      });
    }
  }

  if (metrics.PPGlucose != null) {
    const v = metrics.PPGlucose;
    if (v >= 200) {
      insights.push({
        level: "high",
        title: "High post-meal glucose",
        text: `Post-prandial glucose is ${v} mg/dL (≥ 200 mg/dL suggests diabetes).`,
      });
    } else if (v >= 140) {
      insights.push({
        level: "warning",
        title: "Borderline post-meal glucose",
        text: `PP glucose is ${v} mg/dL (140–199 mg/dL = prediabetes range).`,
      });
    } else {
      insights.push({
        level: "ok",
        title: "PP glucose in normal range",
        text: `PP glucose is ${v} mg/dL (normal < 140 mg/dL).`,
      });
    }
  }

  if (metrics.Creatinine != null) {
    const v = metrics.Creatinine;
    if (v > 1.2) {
      insights.push({
        level: "high",
        title: "Raised creatinine",
        text: `Creatinine is ${v} mg/dL. May indicate reduced kidney function. Must be interpreted by a doctor.`,
      });
    } else {
      insights.push({
        level: "ok",
        title: "Creatinine in acceptable range",
        text: `Creatinine is ${v} mg/dL. Within typical adult reference range in many labs.`,
      });
    }
  }

  return insights;
}

function pillClasses(level) {
  if (level === "high") return "bg-red-100 text-red-800 border-red-300";
  if (level === "warning")
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-emerald-100 text-emerald-800 border-emerald-300";
}

export default function InsightsPanel({ summary }) {
  if (!summary || !summary.metrics) return null;

  const insights = buildInsights(summary.metrics);
  if (!insights.length) return null;

  return (
    <div className="card mt-4">
      <h3 className="text-lg font-semibold mb-1">AI health insights</h3>
      <p className="text-xs text-gray-500 mb-3">
        Basic interpretation from detected lab values. This is{" "}
        <span className="font-semibold">not medical advice</span>; always
        consult a doctor.
      </p>

      <div className="space-y-2">
        {insights.map((ins, idx) => (
          <div
            key={idx}
            className={`border rounded-md px-3 py-2 text-sm ${pillClasses(
              ins.level
            )}`}
          >
            <div className="font-semibold mb-0.5">{ins.title}</div>
            <div className="text-xs">{ins.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
