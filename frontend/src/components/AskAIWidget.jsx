import React, { useState } from "react";

const API_BASE = "https://hospital-backend-iqva.onrender.com";

export default function AskAIWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hi, I’m a demo medical information assistant. I can explain lab terms and give general info, but I’m NOT a doctor. Always consult a clinician.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    // add user message locally
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      let replyText =
        "I had trouble reaching the AI service. Please try again later.";
      if (res.ok) {
        const data = await res.json();
        if (data && data.reply) replyText = data.reply;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: replyText },
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "There was a network error talking to the AI service. This is just a prototype; please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-full bg-blue-600 text-white text-xs shadow-lg flex items-center gap-2"
        >
          <span className="inline-block w-2 h-2 bg-white rounded-full" />
          <span>Ask AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-40 w-72 sm:w-80 max-h-[70vh] rounded-2xl shadow-2xl bg-white border flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between bg-blue-600 text-white text-xs">
            <div className="font-semibold">Ask AI (demo)</div>
            <button
              onClick={() => setOpen(false)}
              className="text-[10px] bg-white/10 rounded-full px-2 py-0.5"
            >
              ✕
            </button>
          </div>

          <div className="px-3 pt-2 pb-1 text-[10px] text-gray-500 border-b">
            Not a doctor. For general information only. Do not use for
            emergencies.
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-1.5 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[11px] text-gray-400">Thinking…</div>
            )}
          </div>

          <div className="border-t px-2 py-2 flex items-center gap-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about labs, terms..."
              className="flex-1 text-xs border rounded-full px-3 py-1 outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="text-xs px-3 py-1 rounded-full bg-blue-600 text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
