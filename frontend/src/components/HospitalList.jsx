import React from "react";

export default function HospitalList({
  hospitals,
  selected,
  setSelected,
  addHospital,
}) {
  return (
    <div className="w-64 bg-white border-r h-screen py-5">
      <h2 className="px-4 text-lg font-semibold mb-4">Hospital Dashboard</h2>

      <button
        className="btn-primary mx-4 w-[85%] mb-4"
        onClick={addHospital}
      >
        + Add Hospital
      </button>

      <div className="space-y-1 mt-2">
        {hospitals.map((h) => (
          <button
            key={h}
            onClick={() => setSelected(h)}
            className={`w-[85%] mx-4 text-left px-3 py-2 rounded-md border text-sm ${
              selected === h
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}
