export default function Sidebar({ hospitals, selected, setSelected, addHospital }) {
  return (
    <div className="w-64 bg-white shadow-xl p-5 border-r border-gray-200">
      <h2 className="text-xl font-bold mb-3">🏥 Hospital Dashboard</h2>

      <button
        onClick={addHospital}
        className="btn-primary w-full mb-3"
      >+ Add Hospital</button>

      {hospitals.map((h, i) => (
        <button
          key={i}
          onClick={() => setSelected(h)}
          className={`w-full p-2 rounded mb-1 text-left font-medium 
            ${selected === h ? "bg-blue-500 text-white" : "hover:bg-gray-100"}`}
        >
          {h}
        </button>
      ))}
    </div>
  );
}
