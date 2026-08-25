"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import type { QuizMeta, AssignmentResult } from "@/lib/types";
import { SiKuisLogoMark } from "@/components/icons";
import { downloadCsv } from "@/lib/csv";

interface AssignmentRow {
  id: string; code: string; title: string;
  createdAt: number; deadlineMs: number;
  resultCount: number; questionCount: number;
}

const HOURS_OPTIONS = [
  { label: "1 jam", h: 1 },
  { label: "8 jam", h: 8 },
  { label: "24 jam", h: 24 },
  { label: "3 hari", h: 72 },
  { label: "7 hari", h: 168 },
];

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function deadlineInfo(deadlineMs: number): { text: string; expired: boolean } {
  const diff = deadlineMs - Date.now();
  if (diff <= 0) return { text: `Tenggat ${fmtDate(deadlineMs)} · berakhir`, expired: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  return { text: days > 0 ? `Sisa ${days} hari ${hours} jam` : `Sisa ${hours} jam`, expired: false };
}

function getOwnerKey(): string {
  if (typeof window === "undefined") return "";
  let k = localStorage.getItem("sikuis:ownerKey");
  if (!k) {
    k = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("sikuis:ownerKey", k);
  }
  return k;
}

export default function AssignmentsPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState("");
  const [hours, setHours] = useState(24);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ code: string; link: string } | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AssignmentResult[]>>({});

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    const ownerKey = getOwnerKey();
    function loadAll() {
      socket.emit("quizzes:list", {}, (list: QuizMeta[]) => {
        setQuizzes(list);
        setQuizId((prev) => prev || list[0]?.id || "");
      });
      socket.emit("assignment:list", { ownerKey }, (list: AssignmentRow[]) => {
        setRows(list);
        setLoading(false);
      });
      // banner dari redirect /quizzes?created=KODE
      const created = new URLSearchParams(window.location.search).get("created");
      if (created) {
        setCreated({ code: created, link: `${window.location.origin}/assign/${created}` });
        window.history.replaceState({}, "", "/assignments");
      }
    }
    if (socket.connected) loadAll();
    else socket.once("connect", loadAll);
  }, []);

  function refreshList() {
    socketRef.current?.emit("assignment:list", {}, (list: AssignmentRow[]) => setRows(list));
  }

  function handleCreate() {
    if (!quizId || creating) return;
    setCreating(true);
    setError("");
    socketRef.current?.emit("assignment:create", { quizId, hours, ownerKey: getOwnerKey() }, (res: { ok?: boolean; code?: string; error?: string }) => {
      setCreating(false);
      if (res.error || !res.code) { setError(res.error ?? "Gagal membuat tugas"); return; }
      setCreated({ code: res.code!, link: `${window.location.origin}/assign/${res.code}` });
      refreshList();
    });
  }

  function toggleResults(code: string) {
    if (expanded === code) { setExpanded(null); return; }
    setExpanded(code);
    if (!results[code]) {
      socketRef.current?.emit("assignment:results", { code }, (res: { ok?: boolean; results?: AssignmentResult[] }) => {
        if (res.ok && res.results) setResults((prev) => ({ ...prev, [code]: res.results! }));
      });
    }
  }

  function exportCsv(row: AssignmentRow) {
    const rs = results[row.code] ?? [];
    downloadCsv(`tugas-${row.code}-${row.title.replace(/\s+/g, "_")}.csv`,
      ["Peringkat", "Nama", "Skor", "Benar", "Total Dinilai", "Selesai Pada"],
      rs.map((r, i) => [i + 1, r.name, r.score, r.correctCount, r.total, fmtDate(r.finishedAt)]));
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ background: "linear-gradient(135deg, #4C1D95 0%, #6D28D9 60%, #7C3AED 100%)", padding: "1.75rem 1.5rem 2.25rem", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(245,158,11,0.12)", pointerEvents: "none" }} />
        <button onClick={() => router.push("/")} style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 40, padding: "0.35rem 0.875rem", color: "rgba(255,255,255,0.85)",
          fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", marginBottom: "1.25rem",
        }}>
          ← Beranda
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <SiKuisLogoMark size={32} id="as-logo" />
          <div>
            <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "1.5rem", letterSpacing: "-0.03em" }}>Tugas & PR</h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: "0.15rem" }}>
              Kuis mandiri dengan tenggat waktu — siswa kerjakan kapan saja
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
        {/* Buat tugas */}
        <section style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem", marginBottom: "0.9rem" }}>Buat Tugas Baru</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <select value={quizId} onChange={(e) => setQuizId(e.target.value)} className="input"
              style={{ flex: "2 1 220px", fontSize: "0.85rem", height: 40, padding: "0.4rem 0.75rem", color: "var(--text)", lineHeight: 1.5 }}>
              {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
            <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="input"
              style={{ flex: "1 1 110px", fontSize: "0.85rem", height: 40, padding: "0.4rem 0.75rem", color: "var(--text)", lineHeight: 1.5 }}>
              {HOURS_OPTIONS.map((o) => <option key={o.h} value={o.h}>Tenggat: {o.label}</option>)}
            </select>
            <button onClick={handleCreate} disabled={creating || !quizId} style={{
              flex: "0 0 auto", height: 40, padding: "0 1.2rem",
              background: creating ? "var(--surface-3)" : "var(--accent)",
              color: "#fff", border: "none", borderRadius: 12,
              fontWeight: 800, fontSize: "0.82rem", cursor: creating ? "wait" : "pointer",
            }}>
              {creating ? "Membuat..." : "Buat Tugas"}
            </button>
          </div>
          {error && <p style={{ color: "#DC2626", fontSize: "0.78rem", fontWeight: 600, marginTop: "0.6rem" }}>{error}</p>}
          {created && (
            <div style={{ marginTop: "0.9rem", padding: "0.9rem 1rem", background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.3)", borderRadius: 12 }}>
              <p style={{ color: "#16A34A", fontWeight: 800, fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                Tugas dibuat! Kode: <span style={{ fontSize: "1.05rem", letterSpacing: "0.12em" }}>{created.code}</span>
              </p>
              <p style={{ color: "var(--text-dim)", fontSize: "0.75rem", wordBreak: "break-all", marginBottom: "0.5rem" }}>{created.link}</p>
              <button onClick={() => navigator.clipboard?.writeText(created.link)} style={{
                background: "var(--surface-3)", border: "1px solid var(--border-hi)", borderRadius: 40,
                padding: "0.3rem 0.8rem", color: "var(--text)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
              }}>
                Salin link untuk siswa
              </button>
            </div>
          )}
        </section>

        {/* Daftar tugas */}
        <h2 style={{ fontWeight: 800, color: "var(--text)", fontSize: "1rem", marginBottom: "0.75rem" }}>
          Tugas Aktif {rows.length > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>({rows.length})</span>}
        </h2>
        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Memuat...</p>
        ) : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text-dim)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}></div>
            <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>Belum ada tugas. Buat yang pertama di atas!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {rows.map((row) => {
              const dl = deadlineInfo(row.deadlineMs);
              const isOpen = expanded === row.code;
              return (
                <div key={row.id} style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  <button onClick={() => toggleResults(row.code)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.9rem 1rem", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.08em", color: "var(--accent)", background: "rgba(37,99,235,0.1)", padding: "0.25rem 0.55rem", borderRadius: 8 }}>
                      {row.code}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 800, color: "var(--text)", fontSize: "0.85rem" }}>{row.title}</span>
                      <span style={{ display: "block", color: dl.expired ? "#DC2626" : "var(--text-muted)", fontSize: "0.68rem", marginTop: "0.15rem" }}>
                        {dl.text} · {row.resultCount} jawaban masuk
                      </span>
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "0.9rem 1rem" }}>
                      {!results[row.code] ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Memuat hasil...</p>
                      ) : results[row.code].length === 0 ? (
                        <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>Belum ada siswa yang mengerjakan.</p>
                      ) : (
                        <>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                            <thead>
                              <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                                <th style={{ padding: "0.35rem 0.4rem" }}>#</th>
                                <th style={{ padding: "0.35rem 0.4rem" }}>Nama</th>
                                <th style={{ padding: "0.35rem 0.4rem" }}>Skor</th>
                                <th style={{ padding: "0.35rem 0.4rem" }}>Benar</th>
                                <th style={{ padding: "0.35rem 0.4rem" }}>Waktu</th>
                              </tr>
                            </thead>
                            <tbody>
                              {results[row.code].map((r, i) => (
                                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                                  <td style={{ padding: "0.4rem", color: "var(--text-muted)" }}>{i + 1}</td>
                                  <td style={{ padding: "0.4rem", fontWeight: 700, color: "var(--text)" }}>{r.name}</td>
                                  <td style={{ padding: "0.4rem", color: "var(--accent)", fontWeight: 800 }}>{r.score.toLocaleString("id-ID")}</td>
                                  <td style={{ padding: "0.4rem", color: "var(--text-dim)" }}>{r.correctCount}/{r.total}</td>
                                  <td style={{ padding: "0.4rem", color: "var(--text-muted)", fontSize: "0.7rem" }}>{fmtDate(r.finishedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button onClick={() => exportCsv(row)} style={{
                            marginTop: "0.7rem", background: "var(--surface-3)", border: "1px solid var(--border-hi)",
                            borderRadius: 40, padding: "0.35rem 0.85rem", color: "var(--text)",
                            fontSize: "0.72rem", fontWeight: 700, cursor: "pointer",
                          }}>
                            Export CSV
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
