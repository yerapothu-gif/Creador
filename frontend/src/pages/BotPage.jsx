import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { botApi } from "../services/api";
import "./BotPage.css";

const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "ta", label: "தமிழ்" },
  { code: "te", label: "తెలుగు" },
  { code: "bn", label: "বাংলা" },
];

const SUGGESTION_PROMPTS = [
  "How can I avoid loan scams?",
  "What is Atal Pension Yojana?",
  "How do I open a Jan Dhan account?",
  "What is a Mudra loan and who is eligible?",
  "How does compound interest work?",
  "How to file an ITR return?",
];

const CATEGORY_ICONS = {
  loans: "💰",
  retirement: "🏦",
  investment: "📈",
  taxation: "🧾",
  schemes: "🏛️",
  scam_alert: "🚨",
};

// Check if Web Speech API is available
const SpeechRecognitionAPI =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

let msgIdCounter = 0;
function makeId() {
  return ++msgIdCounter;
}

export default function BotPage() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedLang, setSelectedLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(!!SpeechRecognitionAPI);
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingMsgIdRef = useRef(null);

  // Scroll anchor
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Add welcome message on mount
  useEffect(() => {
    setMessages([
      {
        id: makeId(),
        role: "bot",
        text: `Namaste! I'm Creador's Financial Literacy Assistant. I can answer your questions about loans, savings, government schemes, taxation, and how to protect yourself from scams — all based on Creador's verified knowledge library.\n\nHow can I help you today?`,
        sources: [],
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  // ── Voice Input ──────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return;

    setVoiceError("");

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    // Map our lang codes to BCP-47 tags
    const langMap = {
      en: "en-IN",
      hi: "hi-IN",
      mr: "mr-IN",
      ta: "ta-IN",
      te: "te-IN",
      bn: "bn-IN",
    };
    recognition.lang = langMap[selectedLang] || "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
      inputRef.current?.focus();
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        setVoiceError("Microphone permission denied. Please allow microphone access.");
      } else if (event.error === "no-speech") {
        setVoiceError("No speech detected. Please try again.");
      } else {
        setVoiceError(`Voice error: ${event.error}`);
      }
      setTimeout(() => setVoiceError(""), 4000);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, [selectedLang]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Text-to-Speech ───────────────────────────────────────────
  const speakText = useCallback((text, msgId) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking && speakingMsgIdRef.current === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      speakingMsgIdRef.current = msgId;
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  }, [isSpeaking]);

  // ── Send Message ─────────────────────────────────────────────
  const sendMessage = useCallback(async (queryText) => {
    const text = (queryText || inputText).trim();
    if (!text || loading) return;

    // Stop listening if active
    if (isListening) stopListening();

    // Add user message
    const userMsg = {
      id: makeId(),
      role: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setError("");
    setLoading(true);

    try {
      const result = await botApi.query({ text, lang: selectedLang });

      const botMsg = {
        id: makeId(),
        role: "bot",
        text: result.answer,
        sources: result.sources || [],
        sourceContentIds: result.sourceContentIds || [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Bot query failed:", err);
      const statusCode = err.status;
      let errorMsg =
        statusCode === 429
          ? "The assistant is temporarily busy. Please wait a moment and try again."
          : statusCode === 401 || statusCode === 403
          ? "Session expired. Please log in again."
          : err.message || "Something went wrong. Please try again.";

      setError(errorMsg);

      // Add error message in chat
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "bot",
          text: errorMsg,
          isError: true,
          sources: [],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [inputText, loading, isListening, selectedLang, stopListening]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setMessages([
      {
        id: makeId(),
        role: "bot",
        text: "Chat cleared. How can I help you with your financial questions today?",
        sources: [],
        timestamp: new Date(),
      },
    ]);
    setError("");
    setInputText("");
  };

  return (
    <div className="bot-root">
      {/* ── Top Navbar ── */}
      <header className="bot-navbar">
        <div className="bot-nav-inner">
          <Link to="/dashboard" className="bot-brand">
            <div className="bot-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              </svg>
            </div>
            <div>
              <span className="bot-brand-title">Creador Foundation</span>
              <span className="bot-nav-sub">Financial Assistant</span>
            </div>
          </Link>

          <div className="bot-nav-right">
            {/* Language Selector */}
            <div className="lang-selector-wrap">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
              <select
                className="lang-select"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                aria-label="Response language"
              >
                {SUPPORTED_LANGS.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="bot-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{user?.name || "Learner"}</span>
            </div>

            <button className="btn btn-ghost" style={{ fontSize: "0.82rem", padding: "6px 12px" }} onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── Chat Layout ── */}
      <div className="bot-layout">
        {/* ── Sidebar: Info + Suggestions ── */}
        <aside className="bot-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-bot-avatar">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <h2 className="sidebar-title">Financial Assistant</h2>
            <p className="sidebar-desc">
              Ask me anything about loans, savings, government schemes, taxes, or how to protect yourself from financial scams.
            </p>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-label">Try asking</div>
            <div className="suggestion-list">
              {SUGGESTION_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="suggestion-btn"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section sidebar-info-box">
            <div className="info-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="info-text">
              Answers are based on Creador's verified financial literacy content. For critical decisions, consult a certified financial counselor.
            </p>
          </div>

          <button className="btn btn-ghost sidebar-clear-btn" onClick={clearChat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
            </svg>
            Clear Chat
          </button>
        </aside>

        {/* ── Main Chat Panel ── */}
        <main className="bot-chat-panel">
          {/* Messages */}
          <div className="chat-messages" id="chat-messages-container">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message-row ${msg.role === "user" ? "user" : "bot"}`}
              >
                {msg.role === "bot" && (
                  <div className="bot-avatar-small">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                  </div>
                )}

                <div className={`chat-bubble ${msg.role} ${msg.isError ? "error" : ""}`}>
                  <div className="bubble-text">{msg.text}</div>

                  {/* Sources */}
                  {msg.role === "bot" && !msg.isError && msg.sources?.length > 0 && (
                    <div className="sources-section">
                      <div className="sources-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                        Sources
                      </div>
                      <div className="sources-list">
                        {msg.sources.map((src) => (
                          <div key={src._id} className="source-chip">
                            <span className="source-icon">
                              {CATEGORY_ICONS[src.category] || "📄"}
                            </span>
                            <span className="source-title">{src.title}</span>
                            {src.format && (
                              <span className={`source-format fmt-${src.format}`}>
                                {src.format}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bot message footer: timestamp + TTS button */}
                  <div className="bubble-footer">
                    <span className="bubble-time">
                      {msg.timestamp?.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {msg.role === "bot" && !msg.isError && window.speechSynthesis && (
                      <button
                        className={`tts-btn ${isSpeaking && speakingMsgIdRef.current === msg.id ? "active" : ""}`}
                        onClick={() => speakText(msg.text, msg.id)}
                        title={isSpeaking && speakingMsgIdRef.current === msg.id ? "Stop reading" : "Read aloud"}
                      >
                        {isSpeaking && speakingMsgIdRef.current === msg.id ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div className="user-avatar-small">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="chat-message-row bot">
                <div className="bot-avatar-small">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" />
                  </svg>
                </div>
                <div className="chat-bubble bot loading-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="loading-label">Searching knowledge base...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input Bar ── */}
          <div className="chat-input-area">
            {/* Voice error */}
            {voiceError && (
              <div className="voice-error-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {voiceError}
              </div>
            )}

            {/* Listening indicator */}
            {isListening && (
              <div className="listening-banner">
                <div className="listening-pulse" />
                <span>Listening... speak your question</span>
                <button className="btn-stop-voice" onClick={stopListening}>Stop</button>
              </div>
            )}

            <div className="input-row">
              <div className="input-wrapper">
                <textarea
                  ref={inputRef}
                  id="bot-input"
                  className="chat-input"
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about loans, savings, schemes, or scam protection..."
                  disabled={loading || isListening}
                  maxLength={500}
                />
              </div>

              {/* Voice Button */}
              {voiceSupported && (
                <button
                  className={`btn-voice ${isListening ? "listening" : ""}`}
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                  title={isListening ? "Stop listening" : "Speak your question"}
                  id="btn-voice-input"
                >
                  {isListening ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </button>
              )}

              {/* Send Button */}
              <button
                className="btn-send"
                onClick={() => sendMessage()}
                disabled={loading || !inputText.trim()}
                id="btn-send-query"
                title="Send message (Enter)"
              >
                {loading ? (
                  <div className="spinner-small" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>

            <div className="input-footer-hint">
              Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
              {voiceSupported && <> · Click <strong>mic</strong> to speak</>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
