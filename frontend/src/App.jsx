import React, { useState, useRef } from "react";
import HospitalList from "./components/HospitalList";
import UploadCard from "./components/UploadCard";
import SummaryCard from "./components/SummaryCard";
import InsightsPanel from "./components/InsightsPanel";
import LifestylePanel from "./components/LifestylePanel";
import TrendsPanel from "./components/HealthTrends";
import DocumentationCopilot from "./components/DocumentationCopilot";
import ProtocolHints from "./components/ProtocolHints";
import DoctorsCorner from "./components/DoctorsCorner";
import AskAIWidget from "./components/AskAIWidget";
import "./index.css";

// ---------- METRIC EXTRACTION PATTERNS (for trends/insights) ----------
const METRIC_PATTERNS = {
  // HbA1c / Glycohemoglobin
  HbA1c:
    /(HbA1c|HbA1C|Glyco[\s-]*Hemoglobin|Glycated[\s-]*Haemoglobin)[^\d]{0,40}(\d+(\.\d+)?)/i,

  // Fasting glucose
  FastingGlucose:
    /(Plasma[\s-]*Glucose\s*-\s*F|Fasting[\s\w:/-]*Glucose|Fasting\s*Plasma\s*Glucose|\bFPG\b)[^\d]{0,40}(\d+(\.\d+)?)/i,

  // Post-prandial (PP) glucose
  PPGlucose:
    /(Plasma[\s-]*Glucose\s*-\s*PP|Post[\s-]*Prandial[\s\w:/-]*Glucose|PP\s*Glucose|\bPPG\b)[^\d]{0,40}(\d+(\.\d+)?)/i,

  // Creatinine
  Creatinine: /(Creatinine)[^\d]{0,40}(\d+(\.\d+)?)/i,
};

// Pull numeric values from extracted text
function extractMetricsFromText(text) {
  const metrics = {};
  if (!text) return metrics;

  for (const [key, regex] of Object.entries(METRIC_PATTERNS)) {
    const match = text.match(regex);
    if (match && match[2]) {
      const value = parseFloat(match[2]);
      if (!Number.isNaN(value)) metrics[key] = value;
    }
  }
  return metrics;
}

export default function App() {
  // Hospitals
  const [hospitals, setHospitals] = useState(["Baptist Hospital"]);
  const [selectedHospital, setSelectedHospital] = useState("Baptist Hospital");

  // Current + history
  const [currentSummary, setCurrentSummary] = useState(null);
  const [summaryHistory, setSummaryHistory] = useState({}); // { [hospital]: [records] }
  const [historyFilter, setHistoryFilter] = useState("all"); // all | today | week

  // ref pointing to the upload section (used for scrolling on mobile)
  const uploadSectionRef = useRef(null);

  const scrollToUpload = () => {
    if (uploadSectionRef.current) {
      uploadSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleSelectHospital = (name) => {
    setSelectedHospital(name);
    scrollToUpload();
  };

  const addHospital = () => {
    const name = prompt("Enter hospital name");
    if (!name) return;
    if (hospitals.includes(name)) {
      setSelectedHospital(name);
      scrollToUpload();
      return;
    }
    setHospitals((prev) => [...prev, name]);
    setSelectedHospital(name);
    scrollToUpload();
  };

  const handleNewSummary = (hospital, data) => {
    const metrics = extractMetricsFromText(
      data.extracted_text || data.summary || ""
    );

    const record = {
      id: Date.now(),
      hospital,
      filename: data.filename,
      summary: data.summary,
      extracted_text: data.extracted_text,
      used_ocr: data.used_ocr,
      metrics,
      createdAt: new Date().toISOString(),
    };

    setCurrentSummary(record);

    setSummaryHistory((prev) => {
      const existing = prev[hospital] || [];
      return {
        ...prev,
        [hospital]: [record, ...existing],
      };
    });
  };

  const hospitalSummaries = summaryHistory[selectedHospital] || [];
  const summaryCount = hospitalSummaries.length;
  const lastSummaryTime = summaryCount ? hospitalSummaries[0].createdAt : null;

  // Filter history
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const filteredSummaries = hospitalSummaries.filter((item) => {
    if (historyFilter === "all") return true;

    if (historyFilter === "today") {
      return item.createdAt.slice(0, 10) === todayKey;
    }

    if (historyFilter === "week") {
      const d = new Date(item.createdAt);
      const diffDays = (now - d) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }

    return true;
  });

  return (
    <div className="relative flex flex-col md:flex-row min-h-screen bg-[#eef5ff] overflow-x-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-white">
        <HospitalList
          hospitals={hospitals}
          selected={selectedHospital}
          setSelected={handleSelectHospital}
          addHospital={addHospital}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Header */}
        <h1 className="text-xl md:text-2xl font-bold">Hospital Dashboard</h1>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-3 mb-4 gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">
              {selectedHospital}
            </h2>
            <p className="text-xs md:text-sm text-gray-600">
              Upload reports &amp; generate summaries
            </p>
          </div>

          <div className="px-3 py-2 rounded-lg bg-white shadow-sm border text-xs self-start md:self-auto">
            <div className="font-semibold text-gray-700">
              {summaryCount} summaries
            </div>
            <div className="text-gray-500">
              {summaryCount === 0
                ? "No reports yet"
                : "Latest: " + new Date(lastSummaryTime).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Upload + summary row */}
        <div
          ref={uploadSectionRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
        >
          <UploadCard
            hospital={selectedHospital}
            onNewSummary={handleNewSummary}
            setLoading={() => {}}
          />
          <SummaryCard summary={currentSummary} />
        </div>

        {/* AI health insights */}
        <div className="mt-6">
          <InsightsPanel summary={currentSummary} />
        </div>

        {/* Documentation + protocols row */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <DocumentationCopilot summary={currentSummary} />
          <ProtocolHints summary={currentSummary} />
        </div>

        {/* Lifestyle suggestions */}
        <div className="mt-6">
          <LifestylePanel summary={currentSummary} />
        </div>

        {/* Health trends */}
        <div className="mt-6">
          <TrendsPanel summaries={hospitalSummaries} />
        </div>

        {/* Doctor's Corner */}
        <div className="mt-8">
          <DoctorsCorner summaries={hospitalSummaries} />
        </div>

        {/* History */}
        <div className="mt-8 pb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-3">
            <h3 className="text-lg md:text-xl font-semibold">
              Previous summaries
            </h3>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setHistoryFilter("all")}
                className={`px-3 py-1 rounded-full border ${
                  historyFilter === "all"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setHistoryFilter("today")}
                className={`px-3 py-1 rounded-full border ${
                  historyFilter === "today"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setHistoryFilter("week")}
                className={`px-3 py-1 rounded-full border ${
                  historyFilter === "week"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700"
                }`}
              >
                Last 7 days
              </button>
            </div>
          </div>

          {filteredSummaries.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No summaries yet for this hospital with current filter.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredSummaries.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentSummary(item)}
                  className="w-full text-left px-3 py-2 rounded-md border bg-white hover:bg-blue-50 flex justify-between items-center text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {item.filename || "Report"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString()} •{" "}
                      {item.used_ocr ? "OCR used" : "Text PDF"}
                    </div>
                  </div>
                  <div className="text-xs text-blue-600">View</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Ask AI widget */}
      <AskAIWidget />
    
    import AskAI from "./components/AskAI";  // ⬅ add at top

...

return (
  <div className="flex h-screen">
    {/* ...all existing dashboard code... */}

    <AskAI />   {/* ⬅ this makes the floating AI button visible */}
  </div>
);
</div>
  );
}
