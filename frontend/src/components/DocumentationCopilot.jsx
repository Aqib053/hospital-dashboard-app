import React from "react";

export default function DocumentationCopilot({ summary }) {
  if (!summary) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">Documentation copilot</h3>
        <p className="text-xs text-gray-500">
          Upload a report to auto-generate a draft note.
        </p>
      </div>
    );
  }

  const text = summary.summary || summary.extracted_text || "";
  const filename = summary.filename || "Report";

  // very simple keyword-based “problem list”
  const problems = [];
  const lower = text.toLowerCase();
  if (lower.includes("hba1c") || lower.includes("prediabetes"))
    problems.push("Glycemic control / possible prediabetes");
  if (lower.includes("diabetes")) problems.push("Diabetes mellitus");
  if (lower.includes("hypertension") || lower.includes("bp "))
    problems.push("Hypertension / BP monitoring");
  if (lower.includes("creatinine")) problems.push("Renal function monitoring");

  const today = new Date(summary.createdAt || Date.now()).toLocaleDateString();

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">Documentation copilot</h3>
      <p className="text-[11px] text-gray-500 mb-2">
        Draft-only. For clinicians to review and edit before use.
      </p>

      <div className="text-xs bg-gray-50 rounded-md border px-3 py-2 whitespace-pre-wrap leading-relaxed">
        <strong>Discharge / progress note draft</strong>
        {"\n\n"}
        <strong>Date:</strong> {today}
        {"\n"}
        <strong>Source report:</strong> {filename}
        {"\n\n"}
        <strong>Summary of key findings:</strong>
        {"\n"}
        {text.slice(0, 500) || "No summary text available."}
        {text.length > 500 ? " ..." : ""}

        {"\n\n"}
        <strong>Problem list (auto-detected):</strong>
        {"\n"}
        {problems.length === 0
          ? "- No specific problems detected. Please review full report."
          : problems.map((p, idx) => `- ${p}${idx === problems.length - 1 ? "" : "\n"}`)}

        {"\n\n"}
        <strong>Plan (to be completed by treating doctor):</strong>
        {"\n"}
        - Correlate with clinical findings and history.{"\n"}
        - Confirm diagnosis and management plan as per hospital protocol.{"\n"}
        - Document medications, follow-up and patient counselling.
      </div>
    </div>
  );
}
