import React, { useState } from "react";
import HospitalList from "./components/HospitalList";
import UploadCard from "./components/UploadCard";
import SummaryCard from "./components/SummaryCard";
import InsightsPanel from "./components/InsightsPanel";
import LifestylePanel from "./components/LifestylePanel";
import TrendsPanel from "./components/HealthTrends";
import "./index.css";

// ... METRIC_PATTERNS + extractMetricsFromText stay the same ...

export default function App() {
  // Hospitals
  const [hospitals, setHospitals] = useState(["Baptist Hospital"]);
  const [selectedHospital, setSelectedHospital] = useState("Baptist Hospital");

  // Current + history
  const [currentSummary, setCurrentSummary] = useState(null);
  const [summaryHistory, setSummaryHistory] = useState({});
  const [historyFilter, setHistoryFilter] = useState("all");

  const addHospital = () => {
    const name = prompt("Enter hospital name");
    if (!name) return;
    if (hospitals.includes(name)) return;
    setHospitals((prev) => [...prev, name]);
    if (!selectedHospital) setSelectedHospital(name);
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
    // 👇 responsive: column on mobile, row on md+
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* LEFT SIDEBAR */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r bg-white">
        <HospitalList
          hospitals={hospitals}
          selected={selectedHospital}
          setSelected={setSelectedHospital}
          addHospital={addHospital}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#eef5ff]">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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

        {/* Lifestyle suggestions */}
        <div className="mt-6">
          <LifestylePanel summary={currentSummary} />
        </div>

        {/* Health trends */}
        <div className="mt-6">
          <TrendsPanel summaries={hospitalSummaries} />
        </div>

        {/* History */}
        <div className="mt-8">
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
    </div>
  );
}
