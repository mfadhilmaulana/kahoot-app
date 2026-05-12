"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HostPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/quizzes"); }, [router]);
  return (
    <main className="min-h-screen center" style={{ background: "var(--bg)" }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: "3px solid var(--border)",
        borderTopColor: "var(--accent)",
        animation: "spinRing 0.8s linear infinite",
      }} />
    </main>
  );
}
