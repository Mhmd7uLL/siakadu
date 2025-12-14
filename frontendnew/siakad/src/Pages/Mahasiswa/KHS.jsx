import React, { useEffect, useState } from "react";
import PredictChance from "../Mahasiswa/predict";

const API_BASE = "http://localhost:5000/api";

function tryParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }

async function fetchSessionRaw() {
  try {
    const r = await fetch(`${API_BASE}/session`, { credentials: "include" });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch (e) {
    return null;
  }
}

export default function StudentKHS({ studentId: propStudentId = null, showKhsTable = true }) {
  const storedId = typeof window !== "undefined" ? localStorage.getItem("studentId") : null;
  const [studentId, setStudentId] = useState(propStudentId || (storedId ? Number(storedId) : null));
  const [detectedFromSession, setDetectedFromSession] = useState(false);

  const [ipk, setIpk] = useState(null);
  const [prob, setProb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [khsRows, setKhsRows] = useState([]);
  const [scoresRows, setScoresRows] = useState([]);
  const [message, setMessage] = useState(null);

  // resolve student id (minimal order: prop -> localStorage -> session -> window -> qs)
  useEffect(() => {
    let mounted = true;
    async function resolve() {
      if (propStudentId) { setStudentId(Number(propStudentId)); return; }
      if (storedId) {
        const n = Number(storedId);
        if (!Number.isNaN(n) && n) { setStudentId(n); return; }
      }

      // try session
      const sess = await fetchSessionRaw();
      if (mounted && sess && sess.user && (sess.user.id || sess.user.student_id)) {
        const id = Number(sess.user.id ?? sess.user.student_id);
        if (!Number.isNaN(id) && id) {
          setStudentId(id);
          setDetectedFromSession(true);
          try { localStorage.setItem("studentId", String(id)); } catch {}
          return;
        }
      }

      // window globals
      try {
        const win = window || {};
        const cands = [win.__STUDENT__, win.__USER__, win.USER, (win.APP && win.APP.user)];
        for (const c of cands) {
          if (!c) continue;
          const id = Number(c.student_id || c.id || c.nim || c.userId || c.studentId);
          if (!Number.isNaN(id) && id) { setStudentId(id); try { localStorage.setItem("studentId", String(id)); } catch {} ; return; }
        }
      } catch (e) {}

      // querystring
      try {
        const qs = new URLSearchParams(window.location.search);
        const q = qs.get("studentId") || qs.get("id");
        if (q) {
          const n = Number(q);
          if (!Number.isNaN(n) && n) { setStudentId(n); try { localStorage.setItem("studentId", String(n)); } catch {} ; return; }
        }
      } catch (e) {}
    }
    resolve();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propStudentId]);

  // expose helper
  useEffect(() => {
    window.__refreshStudentIpk = (id = null) => {
      try {
        const useId = id || studentId;
        if (useId) fetchAll(useId);
      } catch (e) {}
    };
    return () => { try { delete window.__refreshStudentIpk; } catch {} };
  }, [studentId]);

  async function fetchIpk(id) {
    try {
      const r = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}/ipk`, { credentials: "include" });
      if (!r.ok) { setIpk(null); return; }
      const j = await r.json().catch(() => null);
      setIpk(j?.ipk ?? null);
      // try ML predict
      if (j?.ipk !== null && j?.ipk !== undefined) {
        try {
          const pr = await fetch(`${API_BASE}/ml/predict?ipk=${encodeURIComponent(Number(j.ipk))}`, { credentials: "include" });
          if (pr.ok) {
            const pj = await pr.json().catch(() => null);
            setProb(pj?.probability ?? null);
          } else setProb(null);
        } catch (e) { setProb(null); }
      } else setProb(null);
    } catch (e) {
      console.warn("fetchIpk err", e);
      setIpk(null);
      setProb(null);
    }
  }

  async function fetchKhs(id) {
    try {
      const r = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}/khs`, { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json().catch(() => []);
      return Array.isArray(j) ? j : (j.rows || []);
    } catch (e) {
      return [];
    }
  }

  async function fetchScoresAll(id) {
    try {
      const r = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}/scores-all`, { credentials: "include" });
      if (!r.ok) return [];
      const j = await r.json().catch(() => []);
      return Array.isArray(j) ? j : (j.rows || []);
    } catch (e) {
      return [];
    }
  }

  async function fetchAll(id) {
    if (!id) return;
    setLoading(true);
    setMessage(null);
    try {
      await fetchIpk(id);
      const khs = await fetchKhs(id);
      const scores = await fetchScoresAll(id);
      // split khs into graded / not graded
      const graded = (khs || []).filter(r => r.huruf && String(r.huruf).trim() !== "");
      const ungradedFromKhs = (khs || []).filter(r => !r.huruf || String(r.huruf).trim() === "");
      // student_scores may contain more recent entries; merge them into ungraded list where appropriate
      // We'll produce "pending" list from student_scores where huruf is null, or from khs with no huruf
      const pendingFromScores = (scores || []).filter(s => !s.huruf);
      // build display lists
      setKhsRows(graded);
      // combine unique pending items by kode_matkul + tahun_ajaran
      const pendingMap = new Map();
      for (const p of [...pendingFromScores, ...ungradedFromKhs]) {
        const key = `${p.kode_matkul || ''}::${p.tahun_ajaran || ''}::${p.student_id || ''}`;
        if (!pendingMap.has(key)) pendingMap.set(key, p);
      }
      setScoresRows(Array.from(pendingMap.values()));
      if ((graded.length + pendingMap.size) === 0) {
        setMessage("Belum ada mata kuliah/penilaian untuk mahasiswa ini.");
      }
    } catch (e) {
      console.error("fetchAll error", e);
      setMessage("Gagal memuat data KHS/nilai");
      setKhsRows([]);
      setScoresRows([]);
    } finally {
      setLoading(false);
    }
  }

  // fetch when id resolved
  useEffect(() => {
    if (!studentId) return;
    fetchAll(studentId);
  }, [studentId]);

  return (
    <div className="tugas-wrapper" style={{ paddingBottom: 12 }}>
      <h2>IPK & KHS</h2>

      <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>
        Student ID: <strong>{studentId ?? "-"}</strong>
        {detectedFromSession && <span style={{ marginLeft: 8, color: "#059669" }}>(terdeteksi dari session)</span>}
      </div>

      <div className="card daftar-tugas-card" style={{ padding: 16, marginBottom: 12 }}>
        {loading ? <div>Loading...</div> : (
          <>
            <div style={{ fontSize: 18, fontWeight: 600 }}>IPK: {ipk === null ? "-" : ipk}</div>
            {prob !== null && <div style={{ marginTop: 8, color: "#065f46" }}>Probabilitas lolos (model): {(prob * 100).toFixed(1)}%</div>}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => fetchAll(studentId)} className="btn-tambah-tugas">Refresh</button>
            </div>
            {message && <div style={{ marginTop: 8, color: "#b45309" }}>{message}</div>}
          </>
        )}
      </div>

      {showKhsTable && (
        <>
          <div className="card form-tugas-card" style={{ marginTop: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">Mata Kuliah Bernilai (KHS)</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>{khsRows.length} mata kuliah</div>
            </div>

            <table className="tugas-table" style={{ width: "100%", marginTop: 8 }}>
              <thead>
                <tr><th>Kode</th><th>Nama</th><th>SKS</th><th>Huruf</th><th>Tahun</th><th>Semester</th></tr>
              </thead>
              <tbody>
                {khsRows.length > 0 ? khsRows.map(k => (
                  <tr key={k.id}>
                    <td>{k.kode_matkul || "-"}</td>
                    <td>{k.nama_matkul || "-"}</td>
                    <td style={{ textAlign: "center" }}>{k.sks ?? 0}</td>
                    <td style={{ textAlign: "center" }}>{k.huruf || "-"}</td>
                    <td style={{ textAlign: "center" }}>{k.tahun_ajaran || "-"}</td>
                    <td style={{ textAlign: "center" }}>{k.semester ?? "-"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{ textAlign: "center" }}>- Tidak ada mata kuliah bernilai -</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}