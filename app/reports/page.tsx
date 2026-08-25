"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { GameReport } from "@/lib/types";
import { SiKuisLogoMark } from "@/components/icons";

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ReportsPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [reports, setReports] = useState<GameReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinInput, setPinInput] = useState("");

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    function load() {
      socket.emit("report:list", {}, (list: GameReport[]) => {
        setReports(list);
        setLoading(false);
      });
    }
    if (socket.connected) load();
    else socket.once("connect", load);
  }, []);

  function openPin() {
    const pin = pinInput.replace(/\D/g, "");
    if (pin.length === 6) router.push(`/reports/${pin}`);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background: "linear-gradient(135deg, #0F766E 0%, #0D9488 60%, #14B8A6 100%)", padding: "1.75rem 1.5rem 2.25rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <button onClick={() => router.push("/")} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 40, padding: "0.35rem 0.875rem", color: "rgba(255,255,255,0.85)",
          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", marginBottom: "1.25rem",
        }}>
          ← Beranda
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <SiKuisLogoMark size={32} id="rp-logo" />
          <div>
            <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.03em" }}>Laporan Game</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
              Hasil game live tersimpan permanen — analisis per pemain & per soal
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.1rem", maxWidth: 420 }}>
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && openPin()}
            placeholder="Buka lewat PIN game (6 digit)..."
            className="input" inputMode="numeric"
            style={{ flex: 1, height: 38, fontSize: "0.85rem", letterSpacing: "0.15em" }}
          />
          <button onClick={openPin} disabled={pinInput.length !== 6} className="btn-primary" style={{ height: 38, padding: "0 1rem", fontSize: "0.78rem", opacity: pinInput.length === 6 ? 1 : 0.5 }}>
            Buka
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
        <h2 style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem", marginBottom: "0.75rem" }}>
          Laporan Terbaru {reports.length > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>({reports.length})</span>}
        </h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Memuat...</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 0", color: "var(--text-dim)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}></div>
            <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>Belum ada laporan. Selesaikan satu game live dulu!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(260px,100%), 1fr))", gap: "0.75rem" }}>
            {reports.map((r) => {
              const avgCorrect = r.questions.length
                ? Math.round(r.questions.reduce((s, q) => s + q.correctPct, 0) / r.questions.length)
                : 0;
              return (
                <button key={r.pin} onClick={() => router.push(`/reports/${r.pin}`)} className="a-fadeup"
                  style={{
                    textAlign: "left", background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: 16, padding: "1rem 1.125rem", cursor: "pointer",
                    transition: "border-color 150ms, transform 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#14B8A6"; e.currentTarget.style.transform = "translateY(-3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = ""; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#0D9488", background: "rgba(13,148,136,0.1)", borderRadius: 8, padding: "0.15rem 0.5rem", fontSize: "0.85rem" }}>
                      PIN {r.pin}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{fmtDate(r.endedAt)}</span>
                  </div>
                  <p style={{ fontWeight: 800, color: "var(--text)", fontSize: "0.88rem", margin: "0.35rem 0 0.5rem" }}>{r.title}</p>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", background: "var(--surface-3)", borderRadius: 40, padding: "0.15rem 0.55rem" }}>
                      {r.playerCount} pemain
                    </span>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: avgCorrect >= 60 ? "#16A34A" : avgCorrect >= 40 ? "#CA8A04" : "#DC2626", background: (avgCorrect >= 60 ? "#16A34A" : avgCorrect >= 40 ? "#CA8A04" : "#DC2626") + "18", borderRadius: 40, padding: "0.15rem 0.55rem" }}>
                      rata-rata {avgCorrect}%
                    </span>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-dim)", background: "var(--surface-3)", borderRadius: 40, padding: "0.15rem 0.55rem" }}>
                      {r.questions.length} soal
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
