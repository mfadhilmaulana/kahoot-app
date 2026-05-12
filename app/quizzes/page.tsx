"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuizMeta } from "@/lib/types";

const DIFF_COLOR: Record<string, string> = {
  Mudah: "#16A34A",
  Sedang: "#CA8A04",
  Sulit: "#DC2626",
};

const TYPE_LABEL: Record<string, string> = {
  mc: "Pilihan Ganda",
  tf: "Benar/Salah",
  poll: "Pendapat",
};

export default function QuizzesPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    function loadQuizzes() {
      socket.emit("quizzes:list", {}, (list: QuizMeta[]) => {
        setQuizzes(list);
        setLoading(false);
      });
    }

    if (socket.connected) loadQuizzes();
    else socket.once("connect", loadQuizzes);
  }, []);

  function handleCreate(quizId: string) {
    if (creating) return;
    setCreating(quizId);
    setError("");
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("host:create", { quizId }, (res: { pin?: string; error?: string }) => {
      setCreating(null);
      if (res.error) { setError(res.error); return; }
      if (res.pin) router.push(`/host/${res.pin}`);
    });
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="row px-5 py-4" style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => router.push("/")} className="btn btn-ghost" style={{ marginRight: "1rem", padding: "0.5rem 0.75rem" }}>
          ←
        </button>
        <div>
          <h1 className="t-h3">Pilih Demo Kuis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            {loading ? "Memuat..." : `${quizzes.length} kuis tersedia`}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth: 960, margin: "1.25rem auto 0", padding: "0 1.25rem" }}>
          <div className="card" style={{ padding: "0.875rem 1.125rem", background: "rgba(220,38,38,0.1)", borderColor: "rgba(220,38,38,0.3)" }}>
            <p style={{ color: "#F87171", fontSize: "0.875rem", fontWeight: 600 }}>{error}</p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}>
        {loading ? (
          <div className="center col py-24" style={{ gap: "1rem" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              animation: "spinRing 0.8s linear infinite",
            }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Memuat kuis...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "0.875rem" }}>
            {quizzes.map((quiz, i) => (
              <button
                key={quiz.id}
                onClick={() => handleCreate(quiz.id)}
                disabled={!!creating}
                className="card a-fadeup"
                style={{
                  padding: "1.5rem",
                  textAlign: "left",
                  cursor: creating ? "wait" : "pointer",
                  animationDelay: `${i * 0.05}s`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                  transition: "border-color 140ms, transform 140ms",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hi)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {/* Icon + title */}
                <div className="row" style={{ gap: "0.875rem" }}>
                  <div className="center" style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: quiz.color + "22",
                    border: `1.5px solid ${quiz.color}44`,
                    fontSize: "1.5rem",
                  }}>
                    {quiz.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="t-h3" style={{ marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {quiz.title}
                    </h3>
                    <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", lineHeight: 1.4 }}>
                      {quiz.description}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="row" style={{ gap: "0.35rem", flexWrap: "wrap" }}>
                  <span className="badge" style={{
                    background: DIFF_COLOR[quiz.difficulty] + "1A",
                    color: DIFF_COLOR[quiz.difficulty],
                  }}>
                    {quiz.difficulty}
                  </span>
                  <span className="badge" style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}>
                    {quiz.questionCount} soal
                  </span>
                  <span className="badge" style={{ background: "var(--surface-3)", color: "var(--text-dim)" }}>
                    ~{quiz.estimatedMins} mnt
                  </span>
                  {quiz.types.map((t) => (
                    <span key={t} className="badge" style={{ background: "var(--accent-dim)", color: "var(--accent-hi)" }}>
                      {TYPE_LABEL[t]}
                    </span>
                  ))}
                </div>

                {creating === quiz.id && (
                  <div className="row" style={{ gap: "0.5rem" }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid var(--border)",
                      borderTopColor: "var(--accent)",
                      animation: "spinRing 0.7s linear infinite",
                    }} />
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Membuat game...</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
