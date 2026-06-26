import { useEffect, useRef, useState } from "react";
import { streamChat } from "./api.js";
import "./App.css";

const WELCOME = {
  role: "assistant",
  content: "Hi! I'm your AI assistant. Ask me anything 👋",
};

export default function App() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    const userMsg = { role: "user", content: text };
    // Send full history (minus the welcome message) plus the new message.
    const history = messages.filter((m) => m !== WELCOME);
    const outgoing = [...history, userMsg];

    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        outgoing,
        (chunk) => {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: next[next.length - 1].content + chunk,
            };
            return next;
          });
        },
        controller.signal
      );
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Something went wrong.");
        setMessages((prev) => {
          const next = [...prev];
          // Remove the empty assistant bubble if nothing streamed in.
          if (next[next.length - 1].content === "") next.pop();
          return next;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    stop();
    setMessages([WELCOME]);
    setError("");
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">🤖</span>
          <div>
            <h1>AI Chatbot</h1>
            <p>React · FastAPI · OpenRouter</p>
          </div>
        </div>
        <button className="ghost-btn" onClick={clearChat} title="New chat">
          ＋ New chat
        </button>
      </header>

      <main className="chat" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            <div className="avatar">{m.role === "user" ? "🧑" : "🤖"}</div>
            <div className="bubble">
              {m.content || (loading && i === messages.length - 1 ? (
                <span className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              ) : null)}
            </div>
          </div>
        ))}
        {error && <div className="error">⚠️ {error}</div>}
      </main>

      <footer className="composer">
        <textarea
          ref={textareaRef}
          value={input}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow(e.target);
          }}
          onKeyDown={onKeyDown}
          rows={1}
        />
        {loading ? (
          <button className="send-btn stop" onClick={stop}>
            ■ Stop
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim()}
          >
            ➤ Send
          </button>
        )}
      </footer>
    </div>
  );
}
