import React from "react";

export default function ProtocolHints({ summary }) {
  if (!summary) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">
          Protocol-based suggestions
        </h3>
        <p className="text-xs text-gray-500">
          Upload a report to see protocol-style hints.
        </p>
      </div>
    );
  }

  const metrics = summary.metrics || {};
  const hints = [];

  const hba1c = metrics.HbA1c;
  if (typeof hba1c === "number") {
    if (hba1c < 5.7) {
      hints.push(
        "HbA1c in normal range. Usual practice is periodic screening based on risk profile."
      );
    } else if (hba1c < 6.5) {
      hints.push(
        "HbA1c in prediabetes range. Many protocols suggest lifestyle intervention and repeat testing in 3–6 months."
      );
    } else {
      hints.push(
        "HbA1c in diabetes range. Confirm diagnosis and manage according to diabetes guidelines (medications + lifestyle + complications screening)."
      );
    }
  }

  const fasting = metrics.FastingGlucose;
  if (typeof fasting === "number") {
    if (fasting >= 100 && fasting <= 125) {
      hints.push(
        "Fasting glucose in impaired range. Consider lifestyle counselling and repeat testing."
      );
    } else if (fasting >= 126) {
      hints.push(
        "Fasting glucose in diabetic range. Correlate with HbA1c and consider full diabetes workup."
      );
    }
  }

  const pp = metrics.PPGlucose;
  if (typeof pp === "number") {
    if (pp >= 140 && pp < 200) {
      hints.push(
        "Post-prandial glucose borderline/high. Many protocols recommend diet review and repeat monitoring."
      );
    } else if (pp >= 200) {
      hints.push(
        "Post-prandial glucose markedly elevated. Consider evaluation for uncontrolled diabetes."
      );
    }
  }

  const creat = metrics.Creatinine;
  if (typeof creat === "number") {
    if (creat > 1.3) {
      hints.push(
        "Creatinine elevated. Consider renal function assessment and dose adjustment of renally cleared drugs."
      );
    }
  }

  if (hints.length === 0) {
    hints.push(
      "No specific protocol hints triggered by the detected lab values. Please review the full report and local guidelines."
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Protocol-based suggestions</h3>
      <p className="text-[11px] text-gray-500 mb-2">
        Prototype for evidence-based practice. Not medical advice; always follow
        your hospital&apos;s protocols.
      </p>

      <ul className="list-disc pl-4 text-xs md:text-sm space-y-1 text-gray-800">
        {hints.map((h, idx) => (
          <li key={idx}>{h}</li>
        ))}
      </ul>
    </div>
  );
}
