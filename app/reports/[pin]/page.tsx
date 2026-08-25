"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { GameReport } from "@/lib/types";
import { downloadCsv } from "@/lib/csv";

const TYPE_LABEL: Record<string, string> = {
  mc: "PG", tf: "B/S", poll: "Pendapat", rating: "Rating", open: "Teks", reorder: "Urutkan", blank: "Isian",
};

export default function ReportDetailPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = use(params);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [report, setReport] = useState<GameReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    function load() {
      socket.emit("report:get", { pin }, (res: GameReport | { error: string }) => {
        if ("error" in res) setError(res.error);
        else setReport(res);
      });
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }, [pin]);

  function exportCsv() {
    if (!report) return;
    downloadCsv(`laporan-${report.pin}-${report.title.replace(/\s+/g, "_")}.csv`,
      ["Peringkat", "Nama", "Skor", "Jawaban Benar"],
      report.players.map((p) => [p.rank, p.name, p.score, p.correctCount]));
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          
          <p style={{ color: "var(--text)", fontWeight: 700, marginBottom: "1rem" }}>{error}</p>
          <button onClick={() => router.push("/reports")} className="btn-surface">← Daftar laporan</button>
        </div>
      </main>
    );
  }
  if (!report) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid var(--surface-3)", borderTopColor: "var(--accent)", animation: "spinRing 0.8s linear infinite" }} />
      </main>
    );
  }

  const avgCorrect = report.questions.length
    ? Math.round(report.questions.reduce((s, q) => s + q.correctPct, 0) / report.questions.length)
    : 0;

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)", padding: "1.5rem 1.5rem 1.75rem" }}>
        <button onClick={() => router.push("/reports")} style={{
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 40, padding: "0.35rem 0.875rem", color: "rgba(255,255,255,0.85)",
          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", marginBottom: "1rem",
        }}>
          ← Semua laporan
        </button>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "1.4rem", letterSpacing: "-0.02em" }}>{report.title}</h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
          PIN {report.pin} · selesai {new Date(report.endedAt).toLocaleString("id-ID", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
        {/* Ringkasan */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.6rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Pemain", value: String(report.playerCount), color: "#2563EB" },
            { label: "Soal", value: String(report.questions.length), color: "#7C3AED" },
            { label: "Rata-rata Benar", value: `${avgCorrect}%`, color: avgCorrect >= 60 ? "#16A34A" : avgCorrect >= 40 ? "#CA8A04" : "#DC2626" },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "0.9rem", textAlign: "center" }}>
              <p style={{ color: s.color, fontWeight: 900, fontSize: "1.3rem" }}>{s.value}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 700 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Peringkat pemain */}
        <h2 style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem", marginBottom: "0.7rem" }}>Peringkat Pemain</h2>
        <div style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflowX: "auto", marginBottom: "1.75rem" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 420 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "0.65rem 0.9rem" }}>#</th>
                <th style={{ padding: "0.65rem 0.9rem" }}>Nama</th>
                <th style={{ padding: "0.65rem 0.9rem" }}>Skor</th>
                <th style={{ padding: "0.65rem 0.9rem" }}>Benar</th>
              </tr>
            </thead>
            <tbody>
              {report.players.map((p) => (
                <tr key={p.rank} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.6rem 0.9rem", fontWeight: 800, color: p.rank <= 3 ? ["#F59E0B", "#94A3B8", "#B45309"][p.rank - 1] : "var(--text-muted)" }}>
                    {p.rank}
                  </td>
                  <td style={{ padding: "0.6rem 0.9rem", fontWeight: 700, color: "var(--text)" }}>{p.name}</td>
                  <td style={{ padding: "0.6rem 0.9rem", color: "var(--accent)", fontWeight: 800 }}>{p.score.toLocaleString("id-ID")}</td>
                  <td style={{ padding: "0.6rem 0.9rem", color: "var(--text-dim)" }}>{p.correctCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Analisis per soal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem", gap: "0.75rem", flexWrap: "wrap" }}>
          <h2 style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem" }}>Ketuntasan per Soal</h2>
          <button onClick={exportCsv} className="btn-surface" style={{ padding: "0.35rem 0.85rem", fontSize: "0.72rem" }}>
            Export CSV
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {report.questions.map((q) => (
            <div key={q.index} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "0.8rem 1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center", marginBottom: "0.45rem" }}>
                <span style={{ color: "var(--text)", fontWeight: 600, fontSize: "0.8rem", flex: 1, minWidth: 0 }}>
                  <span style={{ color: "var(--text-muted)", marginRight: "0.4rem" }}>{q.index + 1}.</span>{q.text}
                </span>
                <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-dim)", background: "var(--surface-3)", borderRadius: 40, padding: "0.1rem 0.45rem", flexShrink: 0 }}>
                  {TYPE_LABEL[q.type] ?? q.type}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ flex: 1, height: 8, background: "var(--surface-3)", borderRadius: 40, overflow: "hidden" }}>
                  <div style={{
                    width: `${q.correctPct}%`, height: "100%", transition: "width 400ms",
                    background: q.correctPct >= 60 ? "#16A34A" : q.correctPct >= 40 ? "#CA8A04" : "#DC2626",
                  }} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-dim)", width: 76, textAlign: "right", flexShrink: 0 }}>
                  {q.correctPct}% ({q.correctCount}/{q.answered})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
