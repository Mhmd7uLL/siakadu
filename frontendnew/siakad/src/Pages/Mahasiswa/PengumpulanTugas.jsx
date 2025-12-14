import React, { useEffect, useState } from "react";
const API_BASE = 'http://localhost:5000/api';

const PengumpulanTugas = ({ nim: propNim }) => {
  // Nim detection: prop -> localStorage -> session
  const storedNim = typeof window !== 'undefined' ? localStorage.getItem('nim') : null;
  const [nimInput, setNimInput] = useState(propNim || storedNim || '');
  const [detectedFromSession, setDetectedFromSession] = useState(false);
  const nim = propNim || nimInput;

  const [tugasList, setTugasList] = useState([]);
  const [selectedTugasId, setSelectedTugasId] = useState('');
  const [nama, setNama] = useState('');
  const [file, setFile] = useState(null);
  const [komentar, setKomentar] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Try to get nim from session only when we don't already have nim
  useEffect(() => {
    async function trySession() {
      if (propNim || storedNim || nimInput) return;
      try {
        const res = await fetch('http://localhost:5000/debug/session', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.sessionUser) {
          const s = data.sessionUser;
          const found = s.nim || s.student_nim || s.username || s.id || null;
          if (found) {
            try { localStorage.setItem('nim', String(found)); } catch (e) {}
            setNimInput(String(found));
            setDetectedFromSession(true);
          }
        }
      } catch (e) {
        // no session
      }
    }
    trySession();
    // eslint-disable-next-line
  }, []);

  // auto-load when nim becomes available
  useEffect(() => {
    if (!nim) return;
    try { localStorage.setItem('nim', nim); } catch (e) {}
    fetchAvailable();
    // eslint-disable-next-line
  }, [nim]);

  const fetchAvailable = async () => {
    if (!nim) return;
    setMessage(null);
    setLoading(true);
    try {
      const url = `${API_BASE}/tugas/available?nim=${encodeURIComponent(nim)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(`HTTP ${res.status} ${txt || res.statusText}`);
      }
      const data = await res.json();

      // get student's submissions to mark tasks
      const sres = await fetch(`${API_BASE}/submissions?nim=${encodeURIComponent(nim)}`);
      let submissions = [];
      if (sres.ok) submissions = await sres.json().catch(() => []);
      const submittedByTugas = {};
      (submissions || []).forEach(s => { if (s.tugas_id) submittedByTugas[Number(s.tugas_id)] = s; });

      const annotated = (Array.isArray(data) ? data : []).map(t => ({
        ...t,
        submitted: !!submittedByTugas[t.id],
        submission: submittedByTugas[t.id] || null
      }));
      setTugasList(annotated);
      if (!annotated.length) setMessage({ type: 'info', text: 'Tidak ada tugas untuk NIM ini.' });
    } catch (err) {
      console.error('fetchAvailable error', err);
      setTugasList([]);
      setMessage({ type: 'error', text: 'Gagal mengambil daftar tugas: ' + (err.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const handleManualLoad = () => {
    if (!nimInput) return setMessage({ type: 'error', text: 'Masukkan NIM terlebih dahulu' });
    try { localStorage.setItem('nim', nimInput); } catch (e) {}
    setSelectedTugasId('');
    setDetectedFromSession(false);
    fetchAvailable();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!selectedTugasId) return setMessage({ type: 'error', text: 'Pilih tugas terlebih dahulu' });
    if (!nim) return setMessage({ type: 'error', text: 'NIM tidak tersedia. Silakan login atau masukkan NIM.' });

    try {
      setSending(true);
      const form = new FormData();
      // include nim (server also supports session-based)
      form.append('nim', nim);
      if (nama) form.append('nama', nama);
      if (komentar) form.append('komentar', komentar);
      if (file) form.append('file', file);

      const res = await fetch(`${API_BASE}/tugas/${selectedTugasId}/submit`, {
        method: 'POST',
        credentials: detectedFromSession ? 'include' : undefined,
        body: form
      });

      // handle 409 (already submitted)
      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        setMessage({ type: 'info', text: body?.error || 'Sudah mengumpulkan tugas ini' });
        // mark local
        const existing = body?.submission || null;
        setTugasList(prev => prev.map(t => t.id === Number(selectedTugasId) ? { ...t, submitted: true, submission: existing } : t));
        return;
      }

      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || body?.details || `HTTP ${res.status}`);

      // successful create (201)
      setTugasList(prev => prev.map(t => t.id === Number(selectedTugasId) ? { ...t, submitted: true, submission: body } : t));
      setMessage({ type: 'success', text: 'Tugas berhasil dikirim' });
      setFile(null); setKomentar(''); setNama('');
      // refresh to sync
      fetchAvailable();
    } catch (err) {
      console.error('submit error', err);
      setMessage({ type: 'error', text: err.message || 'Gagal mengirim tugas' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tugas-wrapper">
      <h2 style={{ marginBottom: 12 }}>Pengumpulan Tugas</h2>

      <div style={{ marginBottom: 12 }}>
        <strong>NIM saat ini:</strong> {nim || <span style={{ color: '#666' }}>belum tersedia</span>}
        {detectedFromSession && <span style={{ marginLeft: 8, color: '#059669' }}>(terdeteksi dari session)</span>}
      </div>

      {!propNim && !detectedFromSession && (
        <div style={{ marginBottom: 12 }}>
          <label>Masukkan NIM (untuk testing)</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input className="form-input" value={nimInput} onChange={e => setNimInput(e.target.value)} placeholder="contoh: 0190197" />
            <button className="btn-tambah-tugas" onClick={handleManualLoad}>Muat Tugas</button>
          </div>
        </div>
      )}

      {message && <div style={{ marginBottom: 12 }} className={message.type === 'error' ? 'error-box' : 'message-box'}>{message.text}</div>}

      <div className="top-tugas-grid">
        <div className="card form-tugas-card">
          <div className="card-title">Kirim Tugas</div>
          <form onSubmit={handleSubmit}>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <div className="form-group">
                <label>Pilih Tugas</label>
                <select className="form-input" value={selectedTugasId} onChange={e => setSelectedTugasId(e.target.value)}>
                  <option value="">-- Pilih Tugas --</option>
                  {tugasList.map(t => (
                    <option key={t.id} value={t.id} disabled={t.submitted}>
                      {t.judul} {t.kode_matkul ? `• ${t.kode_matkul}` : ''} • {t.prodi} ({t.tahun_angkatan || '-'}){t.submitted ? ' • (Sudah dikumpulkan)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Nama (opsional)</label>
                <input className="form-input" value={nama} onChange={e => setNama(e.target.value)} />
              </div>

              <div className="form-group file-group">
                <label>File Lampiran</label>
                <input type="file" onChange={e => setFile(e.target.files[0] || null)} />
                {file && <div className="small-muted">Terpilih: {file.name}</div>}
              </div>

              <div className="form-group">
                <label>Komentar</label>
                <textarea className="textarea-input" value={komentar} onChange={e => setKomentar(e.target.value)} />
              </div>

              <div style={{ marginTop: 8 }}>
                <button className="btn-tambah-tugas" type="submit" disabled={sending || !selectedTugasId || (tugasList.find(t => String(t.id) === String(selectedTugasId))?.submitted)}>
                  {sending ? 'Mengirim...' : 'Kirim Tugas'}
                </button>
              </div>
            </fieldset>
          </form>
        </div>

        <div className="card daftar-tugas-card">
          <div className="card-title">Tugas yang Tersedia</div>
          <div className="table-responsive-tugas" style={{ marginTop: 8 }}>
            {loading ? (
              <div>Loading...</div>
            ) : tugasList.length === 0 ? (
              <div className="small-muted">Tidak ada tugas untuk Anda saat ini.</div>
            ) : (
              <table className="tugas-table">
                <thead>
                  <tr><th>No</th><th>Judul</th><th>Prodi</th><th>Tahun</th><th>Matkul</th><th>Deadline</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {tugasList.map((t, i) => (
                    <tr key={t.id}>
                      <td>{i + 1}</td>
                      <td>{t.judul}</td>
                      <td>{t.prodi || '-'}</td>
                      <td>{t.tahun_angkatan || '-'}</td>
                      <td>{t.kode_matkul || '-'}</td>
                      <td>{t.deadline || '-'}</td>
                      <td>{t.submitted ? 'Sudah dikumpulkan' : 'Belum'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PengumpulanTugas;