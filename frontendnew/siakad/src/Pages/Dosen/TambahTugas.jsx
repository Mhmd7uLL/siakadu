import React, { useEffect, useState } from 'react';
import './styles/tambahtugas.css';
const API_BASE = 'http://localhost:5000/api';

const ManajemenTugasPage = ({ dosenId: propDosenId }) => {
  const [dosenId, setDosenId] = useState(propDosenId || null);
  const [canUseSession, setCanUseSession] = useState(false);

  const [matkuls, setMatkuls] = useState([]);
  const [tugasList, setTugasList] = useState([]);
  const [submissions, setSubmissions] = useState([]); // all submissions for dosen (flat)
  const [selectedTugasId, setSelectedTugasId] = useState(null); // tugas being inspected
  const [selectedTugasSubmissions, setSelectedTugasSubmissions] = useState([]);
  const [judul, setJudul] = useState('');
  const [prodi, setProdi] = useState('');
  const [tahunAngkatan, setTahunAngkatan] = useState('');
  const [kodeMatkul, setKodeMatkul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [deadline, setDeadline] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('Aktif');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function detect() {
      if (propDosenId) { setDosenId(Number(propDosenId)); return; }
      try {
        const stored = localStorage.getItem('dosenId');
        if (stored) { setDosenId(Number(stored)); return; }
      } catch (e) {}
      try {
        const res = await fetch(`${API_BASE}/tugas`, { credentials: 'include' });
        if (res.ok) {
          setCanUseSession(true);
          const data = await res.json().catch(()=>null);
          if (Array.isArray(data) && data.length > 0 && data[0].dosen_id) {
            setDosenId(Number(data[0].dosen_id));
            try { localStorage.setItem('dosenId', String(data[0].dosen_id)); } catch(e){}
          }
        }
      } catch (e) {}
    }
    detect();
    // eslint-disable-next-line
  }, [propDosenId]);

  useEffect(() => {
    fetchTugas();
    fetchSubmissions();
    if (dosenId) fetchMatkuls();

    const poll = setInterval(() => {
      if (dosenId) fetchSubmissions();
    }, 10000);
    return () => clearInterval(poll);
    // eslint-disable-next-line
  }, [dosenId, canUseSession]);

  const fetchMatkuls = async () => {
    try {
      const res = await fetch(`${API_BASE}/dosen/${dosenId}/matkul`, { credentials: 'include' });
      if (!res.ok) { setMatkuls([]); return; }
      const data = await res.json();
      setMatkuls(Array.isArray(data) ? data : []);
    } catch (err) { console.error('fetchMatkuls', err); setMatkuls([]); }
  };

  const fetchTugas = async () => {
    try {
      setLoading(true);
      let url = `${API_BASE}/tugas`;
      if (dosenId) url += `?dosen_id=${encodeURIComponent(dosenId)}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) { const txt = await res.text().catch(()=>null); throw new Error(`HTTP ${res.status} ${txt || res.statusText}`); }
      const data = await res.json();
      setTugasList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchTugas error:', err);
      setError('Gagal mengambil tugas: ' + (err.message || String(err)));
    } finally { setLoading(false); }
  };

  const fetchSubmissions = async () => {
    try {
      if (!dosenId) return setSubmissions([]);
      const res = await fetch(`${API_BASE}/dosen/${dosenId}/submissions`, { credentials: 'include' });
      if (!res.ok) { const txt = await res.text().catch(()=>null); throw new Error(`HTTP ${res.status} ${txt || res.statusText}`); }
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchSubmissions error', err);
      setSubmissions([]);
    }
  };

  // fetch submissions for one tugas (detailed view)
  const loadSubmissionsForTugas = async (tugasId) => {
    try {
      setSelectedTugasId(tugasId);
      setSelectedTugasSubmissions([]);
      const res = await fetch(`${API_BASE}/tugas/${tugasId}/submissions`, { credentials: 'include' });
      if (!res.ok) {
        const txt = await res.text().catch(()=>null);
        throw new Error(`HTTP ${res.status} ${txt || res.statusText}`);
      }
      const data = await res.json();
      setSelectedTugasSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('loadSubmissionsForTugas error', err);
      setSelectedTugasSubmissions([]);
      setError('Gagal memuat submissions: ' + (err.message || err));
    }
  };

  const handleCreateTugas = async (e) => {
    e.preventDefault();
    setError(null);
    const effectiveDosenId = dosenId || (typeof window !== 'undefined' ? localStorage.getItem('dosenId') : null);
    if (!effectiveDosenId && !canUseSession) return setError('Dosen belum terdeteksi. Silakan login.');
    if (!judul || !prodi || !tahunAngkatan) return setError('Judul, Prodi dan Tahun Angkatan wajib');

    const form = new FormData();
    if (effectiveDosenId) form.append('dosen_id', String(effectiveDosenId));
    form.append('judul', judul);
    form.append('prodi', prodi);
    form.append('tahun_angkatan', tahunAngkatan);
    if (kodeMatkul) form.append('kode_matkul', kodeMatkul);
    if (deskripsi) form.append('deskripsi', deskripsi);
    if (deadline) form.append('deadline', deadline);
    form.append('status', status || 'Aktif');
    if (file) form.append('file', file);

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/tugas`, { method: 'POST', credentials: 'include', body: form });
      const body = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(body?.error || body?.details || `HTTP ${res.status}`);
      setTugasList(prev => [body, ...prev]);
      fetchSubmissions();
      setJudul(''); setProdi(''); setTahunAngkatan(''); setKodeMatkul(''); setDeskripsi(''); setDeadline(''); setFile(null); setStatus('Aktif');
      if (!dosenId && body && body.dosen_id) {
        try { localStorage.setItem('dosenId', String(body.dosen_id)); setDosenId(Number(body.dosen_id)); } catch(e){}
      }
    } catch (err) {
      console.error('submit tugas', err);
      setError(err.message || 'Gagal menyimpan tugas');
    } finally {
      setSaving(false);
    }
  };

  const submissionCounts = submissions.reduce((acc, s) => { acc[s.tugas_id] = (acc[s.tugas_id]||0)+1; return acc; }, {});

  return (
    <div className="tugas-wrapper" style={{display:'flex', flexDirection:'column', gap:12}}>
      <h2>Manajemen Tugas (Dosen)</h2>

      <div style={{display:'flex', gap:12}}>
        <div style={{flex:1}}>
          <div className="card form-tugas-card">
            <div className="card-title">Tambah Tugas Baru</div>
            {error && <div className="error-box">{error}</div>}
            <form onSubmit={handleCreateTugas}>
              <fieldset disabled={!dosenId && !canUseSession} style={{border:'none', padding:0, margin:0}}>
                <div className="form-group">
                  <label>Judul</label>
                  <input className="form-input" value={judul} onChange={e=>setJudul(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Prodi</label>
                  <input className="form-input" value={prodi} onChange={e=>setProdi(e.target.value)} placeholder="Contoh: Sistem Informasi" />
                </div>
                <div className="form-group">
                  <label>Tahun Angkatan</label>
                  <input className="form-input" value={tahunAngkatan} onChange={e=>setTahunAngkatan(e.target.value)} placeholder="2025/2026" />
                </div>
                <div className="form-group">
                  <label>Mata Kuliah (opsional)</label>
                  <select className="form-input" value={kodeMatkul} onChange={e=>setKodeMatkul(e.target.value)}>
                    <option value="">-- Tidak khusus matkul --</option>
                    {matkuls.map(m => <option key={m.kode_matkul} value={m.kode_matkul}>{m.kode_matkul}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Deskripsi</label>
                  <textarea className="textarea-input" value={deskripsi} onChange={e=>setDeskripsi(e.target.value)} />
                </div>
                <div style={{display:'flex', gap:10}}>
                  <div style={{flex:1}} className="form-group">
                    <label>Deadline</label>
                    <input type="date" className="form-input" value={deadline} onChange={e=>setDeadline(e.target.value)} />
                  </div>
                  <div style={{width:200}} className="form-group">
                    <label>Status</label>
                    <select className="form-input" value={status} onChange={e=>setStatus(e.target.value)}><option>Aktif</option><option>Selesai</option></select>
                  </div>
                </div>
                <div className="form-group">
                  <label>File Lampiran (opsional)</label>
                  <input type="file" onChange={e=>setFile(e.target.files[0]||null)} />
                </div>
                <div style={{marginTop:8}}>
                  <button className="btn-tambah-tugas" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Buat Tugas'}</button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>

        <div style={{width:420}}>
          <div className="card daftar-tugas-card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div className="card-title">Ringkasan Submissions</div>
              <div>
                <button onClick={fetchSubmissions} style={{marginRight:8}}>Refresh</button>
              </div>
            </div>
            <div style={{marginTop:8}}>
              {submissions.length === 0 ? <div className="small-muted">Belum ada submission</div> : (
                <div style={{maxHeight:360, overflow:'auto'}}>
                  <table style={{width:'100%'}}>
                    <thead><tr><th>Tugas</th><th>NIM</th><th>Waktu</th><th>File</th></tr></thead>
                    <tbody>
                      {submissions.map(s => (
                        <tr key={s.id}>
                          <td style={{fontSize:13}}>{s.tugas_id} - {s.judul}</td>
                          <td>{s.nim}</td>
                          <td style={{fontSize:12}}>{s.submitted_at || ''}</td>
                          <td>{s.file_url ? <a href={s.file_url} target="_blank" rel="noreferrer">Download</a> : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{marginTop:8}}>
              <div><strong>Total submissions:</strong> {submissions.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'flex', gap:12}}>
        <div style={{flex:1}}>
          <div className="card daftar-tugas-card">
            <div className="card-title">Daftar Tugas (Anda)</div>
            <div className="table-responsive-tugas" style={{marginTop:8}}>
              <table className="tugas-table">
                <thead>
                  <tr><th>No</th><th>Judul</th><th>Prodi</th><th>Tahun</th><th>Matkul</th><th>Deadline</th><th>Submissions</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {tugasList.length === 0 ? <tr><td colSpan="8" style={{textAlign:'center'}}>Belum ada tugas</td></tr> :
                  tugasList.map((t,i) => (
                    <tr key={t.id}>
                      <td>{i+1}</td>
                      <td>{t.judul}</td>
                      <td>{t.prodi || '-'}</td>
                      <td>{t.tahun_angkatan || '-'}</td>
                      <td>{t.kode_matkul || '-'}</td>
                      <td>{t.deadline || '-'}</td>
                      <td>{submissionCounts[t.id] || 0}</td>
                      <td>
                        <button onClick={() => loadSubmissionsForTugas(t.id)}>Lihat</button>
                        <button style={{marginLeft:8}} onClick={() => { navigator.clipboard?.writeText(window.location.origin + `/tugas/${t.id}`); }}>Salin Link</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{width:520}}>
          <div className="card daftar-tugas-card">
            <div className="card-title">Detail Submissions {selectedTugasId ? `(Tugas ${selectedTugasId})` : ''}</div>
            <div style={{marginTop:8}}>
              {!selectedTugasId ? (
                <div className="small-muted">Klik "Lihat" di daftar tugas untuk menampilkan submissions.</div>
              ) : selectedTugasSubmissions.length === 0 ? (
                <div className="small-muted">Belum ada submission untuk tugas ini.</div>
              ) : (
                <div style={{maxHeight:520, overflow:'auto'}}>
                  <table style={{width:'100%'}}>
                    <thead><tr><th>#</th><th>NIM</th><th>Nama</th><th>Komentar</th><th>File</th><th>Waktu</th></tr></thead>
                    <tbody>
                      {selectedTugasSubmissions.map((s, idx) => (
                        <tr key={s.id}>
                          <td>{idx+1}</td>
                          <td>{s.nim}</td>
                          <td>{s.nama || '-'}</td>
                          <td style={{maxWidth:220, whiteSpace:'pre-wrap'}}>{s.komentar || '-'}</td>
                          <td>{s.file_url ? <a href={s.file_url} target="_blank" rel="noreferrer">Download</a> : '-'}</td>
                          <td style={{fontSize:12}}>{s.submitted_at || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManajemenTugasPage;