import React, { useEffect, useState, useMemo } from 'react';
import "./styles/inputnilai.css";

const API_BASE = "http://localhost:5000/api"; // base API

const BOBOT = {
  kehadiran: 0.10,
  tugas: 0.20,
  uts: 0.30,
  uas: 0.40
};

function computeFinalScoreLocal({ kehadiran = 0, tugas = 0, uts = 0, uas = 0 }) {
  const k = Number(kehadiran) || 0;
  const t = Number(tugas) || 0;
  const u = Number(uts) || 0;
  const ua = Number(uas) || 0;
  const score = Math.round(
    k * BOBOT.kehadiran +
    t * BOBOT.tugas +
    u * BOBOT.uts +
    ua * BOBOT.uas
  );
  const huruf = score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'E';
  return { score, huruf };
}

const clampScore = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
};

/* Helper: try many places to detect current dosen id used elsewhere in app */
function tryParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}
function decodeJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return tryParseJSON(decoded);
  } catch (e) {
    return null;
  }
}
function readCookie(name) {
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (let c of cookies) {
    const [k, ...rest] = c.split('=');
    const key = k.trim();
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
function detectDosenId(fallbackProp) {
  // 1. explicit prop
  if (fallbackProp !== undefined && fallbackProp !== null) {
    const n = Number(fallbackProp);
    if (!Number.isNaN(n)) return n;
  }

  // 2. window common injection points
  try {
    const winCandidates = [
      window.__USER__,
      window.USER,
      window.APP && window.APP.user,
      window.__INITIAL_DATA__ && window.__INITIAL_DATA__.user,
      window.__DATA__ && window.__DATA__.user
    ];
    for (const c of winCandidates) {
      if (c && (c.dosen_id || c.dosenId || c.id)) {
        const n = Number(c.dosen_id || c.dosenId || c.id);
        if (!Number.isNaN(n)) return n;
      }
    }
  } catch (e) {}

  // 3. meta tag injection (some templates)
  try {
    const meta = document.querySelector('meta[name="current-user"], meta[name="user"]');
    if (meta && meta.content) {
      const obj = tryParseJSON(meta.content);
      if (obj && (obj.dosen_id || obj.dosenId || obj.id)) {
        const n = Number(obj.dosen_id || obj.dosenId || obj.id);
        if (!Number.isNaN(n)) return n;
      }
    }
  } catch (e) {}

  // 4. localStorage/sessionStorage common keys
  try {
    const keys = ['user','currentUser','auth','__USER__','__INITIAL_DATA__'];
    for (const k of keys) {
      const raw = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (!raw) continue;
      const obj = tryParseJSON(raw);
      if (obj && (obj.dosen_id || obj.dosenId || obj.id)) {
        const n = Number(obj.dosen_id || obj.dosenId || obj.id);
        if (!Number.isNaN(n)) return n;
      }
    }
  } catch (e) {}

  // 5. cookie or stored JWT tokens
  try {
    // common cookie names
    const cookieCandidates = ['user', 'USER', 'token', 'jwt', 'access_token'];
    for (const name of cookieCandidates) {
      const raw = readCookie(name);
      if (!raw) continue;
      // try parse JSON
      const parsed = tryParseJSON(raw);
      if (parsed && (parsed.dosen_id || parsed.dosenId || parsed.id)) {
        const n = Number(parsed.dosen_id || parsed.dosenId || parsed.id);
        if (!Number.isNaN(n)) return n;
      }
      // try JWT decode
      const payload = decodeJwtPayload(raw);
      if (payload && (payload.dosen_id || payload.dosenId || payload.id)) {
        const n = Number(payload.dosen_id || payload.dosenId || payload.id);
        if (!Number.isNaN(n)) return n;
      }
    }
  } catch (e) {}

  // 6. fallback: try window.localStorage 'user' wrapped field like {profile:{dosen_id:..}}
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('currentUser');
    const obj = tryParseJSON(raw);
    if (obj) {
      const cand = obj.profile || obj.user || obj;
      if (cand && (cand.dosen_id || cand.dosenId || cand.id)) {
        const n = Number(cand.dosen_id || cand.dosenId || cand.id);
        if (!Number.isNaN(n)) return n;
      }
    }
  } catch (e) {}

  return null;
}

const DosenInputNilai = ({ kodeMatkulProp = null, dosenIdProp = null }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingMap, setSavingMap] = useState({});
  const [message, setMessage] = useState(null);

  const [tahunAjaran, setTahunAjaran] = useState('2025/2026');
  const [matkulList, setMatkulList] = useState([]);
  const [selectedMatkul, setSelectedMatkul] = useState(null);

  // detected or provided dosen id
  const detected = useMemo(() => detectDosenId(dosenIdProp), [dosenIdProp]);
  const [dosenId, setDosenId] = useState(detected);

  // allow manual set if detection failed
  useEffect(() => {
    if (detected && detected !== dosenId) setDosenId(detected);
    // eslint-disable-next-line
  }, [detected]);

  const currentKodeMatkul = useMemo(() => {
    if (kodeMatkulProp) return kodeMatkulProp;
    if (selectedMatkul) return selectedMatkul.kode || selectedMatkul.kode_matkul || selectedMatkul.kd || '';
    return '';
  }, [kodeMatkulProp, selectedMatkul]);

  const currentNamaMatkul = useMemo(() => {
    if (!selectedMatkul) return null;
    return selectedMatkul.nama || selectedMatkul.nama_matkul || selectedMatkul.name || null;
  }, [selectedMatkul]);

  const currentSks = useMemo(() => {
    if (!selectedMatkul) return 0;
    return Number(selectedMatkul.sks || selectedMatkul.sks_kur || selectedMatkul.sks_mata || 0) || 0;
  }, [selectedMatkul]);

  const tahunOptions = useMemo(() => {
    const arr = [];
    const start = 2025;
    const current = new Date().getFullYear();
    for (let y = start; y <= current + 1; y++) arr.push(`${y}/${y+1}`);
    return arr;
  }, []);

  useEffect(() => {
    if (!dosenId) {
      // nothing to fetch until dosenId present
      setMatkulList([]);
      setSelectedMatkul(null);
      return;
    }
    fetchMatkulList(dosenId, tahunAjaran);
    // eslint-disable-next-line
  }, [dosenId]);

  useEffect(() => {
    if (selectedMatkul) {
      fetchParticipants(selectedMatkul);
    } else {
      setStudents([]);
    }
    // eslint-disable-next-line
  }, [selectedMatkul, tahunAjaran]);

  async function fetchMatkulList(dosenIdParam, tahun = null) {
  try {
    setMessage(null);
    setLoading(true);
    let url = `${API_BASE}/dosen/${encodeURIComponent(dosenIdParam)}/matkul-nilai`;
    if (tahun) url += `?tahun_ajaran=${encodeURIComponent(tahun)}`;
    console.debug('[fetchMatkulList] trying primary url:', url);
    let r = await fetch(url, { credentials: 'include' });

    // if primary fails, try without tahun, then fallback to /matkul
    if (!r.ok) {
      console.warn('[fetchMatkulList] primary failed status', r.status);
      if (tahun) {
        const url2 = `${API_BASE}/dosen/${encodeURIComponent(dosenIdParam)}/matkul-nilai`;
        console.debug('[fetchMatkulList] retrying without tahun:', url2);
        r = await fetch(url2, { credentials: 'include' });
      }
    }

    if (!r.ok) {
      console.warn('[fetchMatkulList] primary endpoints failed, trying fallback /matkul?dosenId=', dosenIdParam);
      const fbUrl = `${API_BASE}/matkul?dosenId=${encodeURIComponent(dosenIdParam)}`;
      const fallback = await fetch(fbUrl, { credentials: 'include' });
      if (!fallback.ok) {
        // collect response texts for debugging
        const txtPrimary = await r.text().catch(()=>'<no-body>');
        const txtFallback = await fallback.text().catch(()=>'<no-body>');
        console.error('[fetchMatkulList] all attempts failed. primary body:', txtPrimary, 'fallback body:', txtFallback);
        setMatkulList([]);
        setMessage('Tidak dapat memuat daftar mata kuliah.');
        return;
      }
      const data = await fallback.json().catch(()=>null);
      console.debug('[fetchMatkulList] fallback /matkul result:', data);
      setMatkulList(Array.isArray(data) ? data : []);
      return;
    }

    // primary succeeded
    const bodyText = await r.text().catch(()=>null);
    let body;
    try { body = bodyText ? JSON.parse(bodyText) : null; } catch (e) { body = null; }
    console.debug('[fetchMatkulList] primary body (raw):', bodyText, 'parsed:', body);
    const rows = (body && (body.rows || Array.isArray(body) && body)) ? (body.rows || body) : [];
    setMatkulList(rows);
    if (!kodeMatkulProp && rows.length > 0) setSelectedMatkul(rows[0]);
    return;
  } catch (e) {
    console.error('[fetchMatkulList] unexpected error', e);
    setMatkulList([]);
    setMessage('Gagal memuat matkul: ' + (e.message || e));
  } finally {
    setLoading(false);
  }
}

  const fetchParticipants = async (matkul) => {
    if (!matkul || !dosenId) return;
    setLoading(true);
    setMessage(null);
    setStudents([]);
    try {
      const kode = (matkul.kode || matkul.kode_matkul || matkul.kd || '').toString();
      const sem = matkul.semester || 1;
      const ta = matkul.tahun_ajaran || tahunAjaran;
      const url = `${API_BASE}/dosen/${encodeURIComponent(dosenId)}/matkul/${encodeURIComponent(kode)}/mahasiswa?semester=${encodeURIComponent(sem)}&tahun_ajaran=${encodeURIComponent(ta)}`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) {
        const txt = await r.text().catch(()=>null);
        throw new Error(`HTTP ${r.status}: ${txt || ''}`);
      }
      const body = await r.json();
      const rows = body.rows || [];
      const normalized = rows.map((r) => ({
        id: r.student_id,
        nim: r.nim,
        name: r.nama,
        scores: {
          kehadiran: r.existing_score?.kehadiran ?? 0,
          tugas: r.existing_score?.tugas ?? 0,
          uts: r.existing_score?.uts ?? 0,
          uas: r.existing_score?.uas ?? 0,
          nilai_akhir: r.existing_score?.nilai_akhir ?? null,
          huruf: r.existing_score?.huruf ?? null,
          tahun_ajaran: r.existing_score?.tahun_ajaran ?? null
        },
        _graded_for_year: r.existing_score?.tahun_ajaran ?? null
      }));
      setStudents(normalized);
    } catch (e) {
      console.error('fetchParticipants error', e);
      setStudents([]);
      setMessage('Gagal memuat peserta: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const changeScore = (id, field, value) => {
    const v = clampScore(value);
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newScores = { ...s.scores, [field]: v };
      const { score, huruf } = computeFinalScoreLocal(newScores);
      newScores.nilai_akhir = score;
      newScores.huruf = huruf;
      return { ...s, scores: newScores };
    }));
  };

  const saveScores = async (student) => {
    const sid = student.id;
    setSavingMap(prev => ({ ...prev, [sid]: true }));
    setMessage(null);

    if (!selectedMatkul) {
      alert('Pilih mata kuliah terlebih dahulu');
      setSavingMap(prev => { const c = { ...prev }; delete c[sid]; return c; });
      return;
    }

    const minYear = 2025;
    const startYear = Number(String(tahunAjaran).split('/')[0] || 0);
    if (isNaN(startYear) || startYear < minYear) {
      alert(`Penilaian hanya diperbolehkan untuk tahun ajaran ${minYear}/${minYear+1} ke atas.`);
      setSavingMap(prev => { const c = { ...prev }; delete c[sid]; return c; });
      return;
    }

    try {
      const body = {
        kehadiran: Number(student.scores.kehadiran || 0),
        tugas: Number(student.scores.tugas || 0),
        uts: Number(student.scores.uts || 0),
        uas: Number(student.scores.uas || 0),
        kode_matkul: currentKodeMatkul,
        tahun_ajaran: tahunAjaran,
        nama_matkul: currentNamaMatkul,
        sks: currentSks
      };
      const url = `${API_BASE}/students/${encodeURIComponent(sid)}/scores`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'dosen',         // DEV only
          'x-dosen-id': String(dosenId)   // DEV only: server uses this to validate mapping
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const j = await res.json().catch(()=>null);
      if (!res.ok) {
        throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
      }
      const saved = j.saved || j;
      setStudents(prev => prev.map(s => s.id === sid ? {
        ...s,
        scores: {
          ...s.scores,
          kehadiran: saved.kehadiran,
          tugas: saved.tugas,
          uts: saved.uts,
          uas: saved.uas,
          nilai_akhir: saved.nilai_akhir,
          huruf: saved.huruf,
          tahun_ajaran: saved.tahun_ajaran || tahunAjaran
        },
        _graded_for_year: saved.tahun_ajaran || tahunAjaran
      } : s));
      setMessage(`Nilai tersimpan untuk ${student.name}`);
      if (j.khs_complete) {
        alert(`KHS ${tahunAjaran} untuk ${student.name} sudah lengkap.`);
      }

      // notify StudentKHS to refresh (minimal, safe)
      try {
        if (typeof window.__refreshStudentKhs === 'function') {
          // prefer direct refresh helper if present
          try { window.__refreshStudentKhs(sid); } catch (e) {}
        }
      } catch (e) {
        // ignore
      }

      // same-tab event and cross-tab short-lived localStorage flag
      try {
        window.dispatchEvent(new CustomEvent('studentScoresUpdated', { detail: { studentId: sid } }));
        localStorage.setItem('studentScoresUpdated', JSON.stringify({ studentId: sid, ts: Date.now() }));
        setTimeout(() => localStorage.removeItem('studentScoresUpdated'), 1000);
      } catch (e) {
        // ignore notification errors
      }

    } catch (e) {
      console.error('saveScores error', e);
      alert('Gagal menyimpan: ' + (e.message || e));
    } finally {
      setSavingMap(prev => {
        const copy = { ...prev };
        delete copy[sid];
        return copy;
      });
    }
  };

  const saveAll = async () => {
    if (!selectedMatkul) {
      alert('Pilih mata kuliah terlebih dahulu');
      return;
    }
    setMessage(null);
    for (const s of students) {
      if (!s || !s.scores) continue;
      if (s.scores.kehadiran === 0 && s.scores.tugas === 0 && s.scores.uts === 0 && s.scores.uas === 0) continue;
      // eslint-disable-next-line no-await-in-loop
      await saveScores(s);
    }
    if (selectedMatkul) {
      await fetchParticipants(selectedMatkul);
      // ensure other components/tabs know we refreshed list after bulk save
      try {
        window.dispatchEvent(new CustomEvent('studentScoresUpdated', { detail: { studentId: null } }));
        localStorage.setItem('studentScoresUpdated', JSON.stringify({ studentId: null, ts: Date.now() }));
        setTimeout(() => localStorage.removeItem('studentScoresUpdated'), 1000);
      } catch (e) {}
    }
  };

  const stats = useMemo(() => {
    const vals = students.map(s => (s.scores && Number(s.scores.nilai_akhir)) ? Number(s.scores.nilai_akhir) : 0);
    const total = vals.reduce((a,b)=>a+b,0);
    const avg = students.length ? (total / students.length).toFixed(1) : 0;
    const counts = { A:0,B:0,C:0,D:0,E:0 };
    students.forEach(s => {
      const h = (s.scores && (s.scores.huruf || s.scores.huruf === '') ) ? (s.scores.huruf || 'E') : 'E';
      counts[h] = (counts[h] || 0) + 1;
    });
    return { avg, counts };
  }, [students]);

  // manual set UI if dosenId not detected
  const [manualIdInput, setManualIdInput] = useState('');
  const handleSetManualDosen = () => {
    const n = Number(manualIdInput);
    if (isNaN(n) || n <= 0) {
      alert('Masukkan ID dosen valid (angka).');
      return;
    }
    // persist to localStorage so page reload still works
    try { localStorage.setItem('user', JSON.stringify({ dosen_id: n })); } catch {}
    try { window.__USER__ = window.__USER__ || {}; window.__USER__.dosen_id = n; } catch {}
    setDosenId(n);
    setManualIdInput('');
    // fetch matkul immediately
    fetchMatkulList(n, tahunAjaran);
  };

  useEffect(() => {
    let mounted = true;
    async function tryWhoamiFallback() {
      if (dosenId) return; // already have one
      try {
        const r = await fetch(`${API_BASE}/whoami-debug`, { credentials: 'include' });
        if (!r.ok) return;
        const j = await r.json().catch(()=>null);
        if (!mounted || !j) return;
        const cand = j.session?.user || j.user || null;
        const maybeId = cand && (cand.dosen_id || cand.dosenId || cand.id) ? (cand.dosen_id || cand.dosenId || cand.id) : null;
        const n = maybeId ? Number(maybeId) : null;
        if (n && !Number.isNaN(n)) {
          setDosenId(n);
          try { localStorage.setItem('user', JSON.stringify({ dosen_id: n })); } catch (_) {}
          // fetchMatkulList will be triggered by the existing useEffect that watches dosenId
        }
      } catch (e) {
        // ignore network errors
        // console.warn('whoami fallback failed', e);
      }
    }
    tryWhoamiFallback();
    return () => { mounted = false; };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="tugas-wrapper nilai-wrapper">
      <h2 className="nilai-header">Dashboard Dosen - Input Nilai</h2>

      {message && <div style={{marginBottom:10, color:'#065f46'}}>{message}</div>}

      {!dosenId && (
        <div style={{marginBottom:12, padding:12, border:'1px solid #e5e7eb', borderRadius:6, background:'#fff'}}>
          <div style={{marginBottom:6}}>Dosen tidak terdeteksi otomatis.</div>
          <div style={{display:'flex', gap:8}}>
            <input value={manualIdInput} onChange={e=>setManualIdInput(e.target.value)} placeholder="Masukkan dosen ID (angka)" />
            <button onClick={handleSetManualDosen} className="control-button-nilai">Set ID</button>
          </div>
          <div style={{marginTop:8, fontSize:13, color:'#6b7280'}}>Atau pastikan aplikasi menyuntikkan data user (window.__USER__ / localStorage) agar deteksi otomatis bekerja.</div>
        </div>
      )}

      <div className="card form-tugas-card nilai-container">
        <div className="control-section-nilai">
          <div className="control-title-nilai">Input Nilai Mahasiswa</div>
          <div className="control-actions-nilai">
            <select
              className="control-dropdown-nilai"
              value={tahunAjaran}
              onChange={e => setTahunAjaran(e.target.value)}
            >
              {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              className="control-dropdown-nilai"
              value={selectedMatkul ? (selectedMatkul.kode || selectedMatkul.kode_matkul || selectedMatkul.kd) : ''}
              onChange={e => {
                const kode = e.target.value;
                const found = matkulList.find(m => (m.kode || m.kode_matkul || m.kd) === kode);
                if (found) setSelectedMatkul(found);
                else setSelectedMatkul(null);
              }}
              disabled={!dosenId}
            >
              <option value="">{dosenId ? '-- Pilih Mata Kuliah --' : 'Login / set dosen ID untuk melihat matkul'}</option>
              {matkulList.map(m => {
                const kode = m.kode || m.kode_matkul || m.kd || '';
                const nama = m.nama || m.nama_matkul || m.name || '';
                return (
                  <option key={kode || nama} value={kode}>
                    {kode} — {nama} {m.sks ? `(${m.sks} sks)` : ''}
                  </option>
                );
              })}
            </select>

            <button className="control-button-nilai" onClick={async () => { if (dosenId) { await fetchMatkulList(dosenId, tahunAjaran); if (selectedMatkul) fetchParticipants(selectedMatkul); } }}>
              Reload
            </button>
          </div>
        </div>

        <div className="info-matkul-box" style={{display: selectedMatkul ? 'flex' : 'none'}}>
          <div className="info-item">Mata Kuliah: <strong style={{marginLeft:8}}>{currentKodeMatkul} — {currentNamaMatkul}</strong></div>
          <div className="info-item">SKS: <strong style={{marginLeft:8}}>{currentSks}</strong></div>
          <div className="info-item">Tahun: <strong style={{marginLeft:8}}>{tahunAjaran}</strong></div>
        </div>

        {loading ? <div>Loading...</div> : (
          <>
            <div className="table-responsive-nilai" style={{overflowX:'auto'}}>
              <table className="tugas-table nilai-table" style={{minWidth:900}}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>NIM</th>
                    <th>Nama</th>
                    <th>Kehadiran</th>
                    <th>Tugas</th>
                    <th>UTS</th>
                    <th>UAS</th>
                    <th>Nilai Akhir</th>
                    <th>Huruf</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const alreadyGraded = s._graded_for_year === tahunAjaran;
                    return (
                      <tr key={s.id}>
                        <td>{i+1}</td>
                        <td>{s.nim}</td>
                        <td>{s.name}</td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={s.scores?.kehadiran ?? 0}
                            onChange={e => changeScore(s.id, 'kehadiran', e.target.value)}
                            className="score-input"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={s.scores?.tugas ?? 0}
                            onChange={e => changeScore(s.id, 'tugas', e.target.value)}
                            className="score-input"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={s.scores?.uts ?? 0}
                            onChange={e => changeScore(s.id, 'uts', e.target.value)}
                            className="score-input"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={s.scores?.uas ?? 0}
                            onChange={e => changeScore(s.id, 'uas', e.target.value)}
                            className="score-input"
                          />
                        </td>

                        <td className="score-output">{s.scores?.nilai_akhir ?? '-'}</td>
                        <td>
                          {s.scores?.huruf ? <span className={`grade-badge grade-${s.scores.huruf}`}>{s.scores.huruf}</span> : '-'}
                        </td>
                        <td>
                          <button
                            onClick={() => saveScores(s)}
                            disabled={!!savingMap[s.id] || alreadyGraded || !selectedMatkul}
                            className="control-button-nilai"
                          >
                            {alreadyGraded ? 'Sudah Dinilai' : (savingMap[s.id] ? 'Menyimpan...' : 'Simpan')}
                          </button>
                          {alreadyGraded && <span style={{marginLeft:8}} className="badge-muted">Sudah dinilai ({tahunAjaran})</span>}
                          {!selectedMatkul && <div style={{color:'#b91c1c', marginTop:6}}>Pilih mata kuliah terlebih dahulu</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="statistic-section" style={{marginTop:12}}>
              <div className="statistic-title">Statistik</div>
              <div className="statistic-grid">
                <div className="stat-item">
                  <div className="stat-value rata-rata">{stats.avg}</div>
                  <div className="stat-label">Rata-rata</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value grade-A">{stats.counts.A}</div>
                  <div className="stat-label">A</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value grade-B">{stats.counts.B}</div>
                  <div className="stat-label">B</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value grade-C">{stats.counts.C}</div>
                  <div className="stat-label">C</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value grade-D_E">{stats.counts.D + stats.counts.E}</div>
                  <div className="stat-label">D/E</div>
                </div>
              </div>
            </div>

            <div style={{marginTop:12}}>
              <button className="btn btn-primary" onClick={saveAll} disabled={loading || !selectedMatkul}>Simpan Semua</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DosenInputNilai;