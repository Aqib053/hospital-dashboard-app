import React, { useState } from "react";

export default function AskAI() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("https://hospital-backend-iqva.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });

      const data = await res.json();
      const botMsg = { role: "ai", text: data.answer || "No response." };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "⚠ AI request failed." }]);
    }

    setInput("");
  };

  return (
    <>
      {/* Floating AI button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 w-14 h-14 rounded-full bg-blue-600 text-white font-bold shadow-xl hover:scale-110 transition z-50"
      >
        AI
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[90%] max-w-md rounded-xl shadow-xl p-4 flex flex-col">
            
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg">Ask Medical AI</h2>
              <button onClick={() => setOpen(false)} className="text-red-500 font-bold">✕</button>
            </div>

            <div className="h-64 overflow-y-auto border p-3 rounded-md bg-gray-50 text-sm">
              {messages.length === 0 && <p className="text-gray-400">Start asking medical queries 💬</p>}
              
              {messages.map((m, i) => (
                <div key={i} className={`my-1 p-2 rounded-md w-fit max-w-[90%] ${
                  m.role === "user"
                    ? "ml-auto bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything medical..."
                className="flex-1 border px-3 py-2 rounded-md text-sm"
              />
              <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded-md">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
