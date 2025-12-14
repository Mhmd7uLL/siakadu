import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './styles/acckrs.css';

const API_BASE = "http://localhost:5000/api";

const getStatusClass = (status) => {
  switch ((status || '').toString().toLowerCase()) {
    case 'pending':
    case 'menunggu':
      return 'badge-menunggu';
    case 'approved':
    case 'disetujui':
      return 'badge-disetujui';
    case 'rejected':
    case 'ditolak':
      return 'badge-ditolak';
    default:
      return 'badge-default';
  }
};

const labelStatus = (status) => {
  switch ((status || '').toString().toLowerCase()) {
    case 'pending':
    case 'menunggu':
      return 'Menunggu';
    case 'approved':
    case 'disetujui':
      return 'Disetujui';
    case 'rejected':
    case 'ditolak':
      return 'Ditolak';
    default:
      return status || '-';
  }
};

const normalizeRows = (data) =>
  data.map((r) => ({
    id: Number(r.id),
    nim: r.nim,
    kode_matkul: r.kode_matkul || r.kode,
    nama_matkul: r.nama_matkul || r.nama || r.nama_matkul,
    sks: Number(r.sks || 0),
    status: r.status || 'pending',
    semester: r.semester,
    tahun_ajaran: r.tahun_ajaran,
    nama_mahasiswa: r.nama_mahasiswa || null,
    nama_dosen: r.nama_dosen || null,
    hari: r.hari || null,
    waktu_mulai: r.waktu_mulai || null,
    waktu_selesai: r.waktu_selesai || null,
    ruang: r.ruang || null
  }));

const PortalModal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          color: '#000',
          padding: 20,
          borderRadius: 8,
          width: '90%',
          maxWidth: 860,
          maxHeight: '85vh',
          overflow: 'auto',
          zIndex: 2147483648,
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>{title}</h4>
          <button type="button" onClick={onClose} style={{ marginLeft: 12 }}>Tutup</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};

const PersetujuanKRS = ({ dosenId: propDosenId }) => {
  const [dosenId, setDosenId] = useState(propDosenId ?? null);
  const [grouped, setGrouped] = useState([]);
  const [rawRows, setRawRows] = useState([]); // normalized rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingIds, setProcessingIds] = useState([]);
  const [semester, setSemester] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState('');
  const [detailModal, setDetailModal] = useState({ open: false, nim: null, items: [], studentName: null, semester: null, tahun_ajaran: null });

  useEffect(() => {
    if (propDosenId) setDosenId(propDosenId);
  }, [propDosenId]);

  useEffect(() => {
    const detect = async () => {
      if (dosenId) return;
      try {
        const res = await fetch(`${API_BASE}/me`);
        if (res.ok) {
          const me = await res.json().catch(() => null);
          const maybe = me && (me.dosen_id || me.dosenId || me.id);
          if (maybe) {
            setDosenId(Number(maybe));
            return;
          }
        }
        const res2 = await fetch(`${API_BASE}/auth/me`);
        if (res2.ok) {
          const me2 = await res2.json().catch(() => null);
          const maybe2 = me2 && (me2.dosen_id || me2.dosenId || me2.id);
          if (maybe2) setDosenId(Number(maybe2));
        }
      } catch {
        // ignore
      }
    };

    detect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dosenId]);

  const fetchPending = async (opts = {}) => {
    if (!dosenId) {
      setError('dosenId tidak tersedia. Silakan login atau kirimkan dosenId sebagai prop.');
      setGrouped([]);
      setRawRows([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = new URLSearchParams();
      if (!opts.override) {
        if (semester) q.set('semester', semester);
        if (tahunAjaran) q.set('tahun_ajaran', tahunAjaran);
      }

      const url = `${API_BASE}/dosen/${dosenId}/krs/pending${q.toString() ? '?' + q.toString() : ''}`;
      const res = await fetch(url);
      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = (raw && (raw.error || raw.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const data = Array.isArray(raw) ? normalizeRows(raw) : [];
      setRawRows(data);

      // group by nim
      const groupedMap = new Map();
      for (const r of data) {
        const nim = r.nim;
        if (!groupedMap.has(nim)) {
          groupedMap.set(nim, {
            nim,
            name: r.nama_mahasiswa || r.nama_mahasiswa || r.nama_dosen || '-',
            semester: r.semester,
            tahun_ajaran: r.tahun_ajaran,
            id_list: [],
            items: [],
            totalSKS: 0,
            jmlMK: 0,
            status: r.status
          });
        }
        const entry = groupedMap.get(nim);
        entry.id_list.push(Number(r.id));
        entry.items.push({ id: Number(r.id), kode: r.kode_matkul, nama: r.nama_matkul, sks: r.sks, status: r.status });
        entry.totalSKS += Number(r.sks || 0);
        entry.jmlMK += 1;
        if (entry.status !== 'pending' && r.status === 'pending') entry.status = 'pending';
      }

      setGrouped(Array.from(groupedMap.values()).sort((a, b) => a.nim.localeCompare(b.nim)));
    } catch (err) {
      setError(err.message || 'Gagal memuat data');
      setGrouped([]);
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dosenId) fetchPending({ override: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dosenId]);

  // ====== UPDATED decideKRS: update UI optimistically and refresh ======
  const decideKRS = async (krsIds, action) => {
    if (!dosenId) {
      alert('dosenId tidak tersedia.');
      return;
    }
    if (!Array.isArray(krsIds) || krsIds.length === 0) return;
    if (!['approve', 'reject'].includes(action)) return;

    if (!window.confirm(`Yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} ${krsIds.length} entri?`)) return;

    const idsToSend = krsIds.map((id) => Number(id));
    setProcessingIds((p) => [...p, ...idsToSend]);

    try {
      const res = await fetch(`${API_BASE}/dosen/${dosenId}/krs/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ krs_ids: idsToSend, action })
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = (body && (body.error || body.message)) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Determine which IDs were actually updated by server (prefer updated_ids)
      const updatedIds = Array.isArray(body?.updated_ids) && body.updated_ids.length > 0
        ? body.updated_ids.map(Number)
        : (body?.updated ? idsToSend : idsToSend);

      // Optimistically remove approved/rejected items from grouped
      if (updatedIds && updatedIds.length > 0) {
        const updatedSet = new Set(updatedIds);
        setGrouped(prev => {
          const newList = prev.map(entry => {
            const remainingItems = entry.items.filter(it => !updatedSet.has(it.id));
            const remainingIds = entry.id_list.filter(id => !updatedSet.has(id));
            return {
              ...entry,
              items: remainingItems,
              id_list: remainingIds,
              totalSKS: remainingItems.reduce((s, it) => s + (Number(it.sks || 0)), 0),
              jmlMK: remainingItems.length,
              // status remains as-is for entries that still have pending items
            };
          }).filter(entry => entry.items.length > 0); // drop entries with no remaining items
          return newList;
        });
      }

      // if server reported insertErrors, show them
      if (body?.insertErrors && body.insertErrors.length > 0) {
        console.warn('Insert jadwal errors', body.insertErrors);
        alert('Status KRS berhasil diubah, namun ada error saat membuat jadwal. Periksa log server atau hubungi admin.');
      }

      // close modal if open
      setDetailModal({ open: false, nim: null, items: [] });

      // refresh from server to ensure final state
      await fetchPending({ override: true });

      alert(`Berhasil ${action === 'approve' ? 'menyetujui' : 'menolak'} ${body.updated || updatedIds.length} entri.`);
    } catch (err) {
      console.error('decideKRS error', err);
      alert('Gagal memproses keputusan: ' + (err.message || err));
    } finally {
      setProcessingIds((p) => p.filter((id) => !idsToSend.includes(id)));
    }
  };
  // ====== end decideKRS ======

  const handleApprove = (entry) => decideKRS(entry.id_list, 'approve');
  const handleReject = (entry) => decideKRS(entry.id_list, 'reject');

  const openDetail = (entry) => {
    let items = Array.isArray(entry.items) ? entry.items.slice() : [];
    if ((!items || items.length === 0) && rawRows && rawRows.length > 0) {
      items = rawRows
        .filter(r => r.nim === entry.nim && (entry.semester ? String(r.semester) === String(entry.semester) : true) && (entry.tahun_ajaran ? String(r.tahun_ajaran) === String(entry.tahun_ajaran) : true))
        .map(r => ({ id: Number(r.id), kode: r.kode_matkul, nama: r.nama_matkul, sks: r.sks, status: r.status }));
    }

    setDetailModal({
      open: true,
      nim: entry.nim,
      items: items || [],
      studentName: entry.name,
      semester: entry.semester,
      tahun_ajaran: entry.tahun_ajaran
    });
  };
  const closeDetail = () => setDetailModal({ open: false, nim: null, items: [] });

  return (
    <div className="krs-wrapper">
      <h2 className="krs-header">Persetujuan KRS Mahasiswa</h2>

      <div className="filters-row">
        <label>
          Semester:
          <select value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">Semua</option>
            <option value="1">Ganjil (1)</option>
            <option value="2">Genap (2)</option>
          </select>
        </label>

        <label>
          Tahun Ajaran:
          <input value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)} placeholder="2024/2025" />
        </label>

        <button type="button" onClick={() => fetchPending()}>Refresh</button>
        <button type="button" onClick={() => fetchPending({ override: true })} style={{ marginLeft: 8 }}>Refresh All</button>
      </div>

      <div className="summary-cards-container">
        <div className="summary-card menunggu">
          <div className="card-value">{grouped.filter(s => (s.status === 'pending' || s.status === 'Menunggu')).length}</div>
          <div className="card-label">Menunggu Persetujuan</div>
          <div className="card-icon">🕒</div>
        </div>
        <div className="summary-card disetujui">
          <div className="card-value">{grouped.filter(s => (s.status === 'approved' || s.status === 'Disetujui')).length}</div>
          <div className="card-label">Sudah Disetujui</div>
          <div className="card-icon">✅</div>
        </div>
        <div className="summary-card ditolak">
          <div className="card-value">{grouped.filter(s => (s.status === 'rejected' || s.status === 'Ditolak')).length}</div>
          <div className="card-label">Ditolak</div>
          <div className="card-icon">❌</div>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}

      <div className="krs-table-container">
        <h3 className="krs-table-title">Daftar Pengajuan KRS</h3>

        <div className="table-responsive">
          <table className="krs-table">
            <thead>
              <tr>
                <th>No</th>
                <th>NIM</th>
                <th>Nama Mahasiswa</th>
                <th>Semester</th>
                <th>Total SKS</th>
                <th>Jumlah MK</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 && !loading ? (
                <tr><td colSpan="8">Tidak ada pengajuan.</td></tr>
              ) : grouped.map((entry, idx) => {
                const isProcessing = entry.id_list.some(id => processingIds.includes(id));
                return (
                  <tr key={entry.nim + '-' + (entry.semester || '')}>
                    <td>{idx + 1}</td>
                    <td>{entry.nim}</td>
                    <td>{entry.name || '-'}</td>
                    <td>{entry.semester ?? '-'}</td>
                    <td>{entry.totalSKS}</td>
                    <td>{entry.jmlMK}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(entry.status)}`}>{labelStatus(entry.status)}</span>
                    </td>
                    <td className="action-buttons">
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                        Items: {entry.items ? entry.items.length : 0}
                      </div>

                      <button type="button" className="btn-detail" onClick={() => openDetail(entry)}>Detail</button>

                      {(entry.status === 'pending' || entry.status === 'Menunggu') && (
                        <>
                          <button type="button" className="btn-setuju" onClick={() => handleApprove(entry)} disabled={isProcessing}>
                            {isProcessing ? 'Processing...' : 'Setuju'}
                          </button>
                          <button type="button" className="btn-tolak" onClick={() => handleReject(entry)} disabled={isProcessing}>
                            {isProcessing ? 'Processing...' : 'Tolak'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PortalModal
        open={detailModal.open}
        onClose={closeDetail}
        title={`Detail KRS - ${detailModal.studentName || detailModal.nim}`}
      >
        <p>Semester: {detailModal.semester ?? '-'} | Tahun: {detailModal.tahun_ajaran ?? '-'}</p>
        {(!detailModal.items || detailModal.items.length === 0) ? (
          <div style={{ padding: 12, background: '#fff6', borderRadius: 6, color: '#000' }}>
            Tidak ada detail matkul untuk pengajuan ini.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ color: '#000' }}>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Matkul</th>
                  <th>SKS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {detailModal.items.map(it => (
                  <tr key={it.id}>
                    <td>{it.kode}</td>
                    <td>{it.nama}</td>
                    <td>{it.sks}</td>
                    <td>{labelStatus(it.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={() => { decideKRS((detailModal.items || []).map(i => i.id), 'approve'); closeDetail(); }} className="btn-setuju">Setujui Semua</button>
          <button type="button" onClick={() => { decideKRS((detailModal.items || []).map(i => i.id), 'reject'); closeDetail(); }} className="btn-tolak">Tolak Semua</button>
        </div>
      </PortalModal>

      <div className="notes-section">
        <h3 className="notes-title">Catatan Penting</h3>
        <ul>
          <li>Maksimal SKS yang dapat diambil mahasiswa adalah <strong>24 SKS</strong></li>
          <li>Persetujuan KRS harus dilakukan <strong>sebelum perkuliahan dimulai</strong></li>
          <li>Pastikan memeriksa <strong>IPK mahasiswa</strong> sebelum menyetujui KRS</li>
        </ul>
      </div>
    </div>
  );
};

export default PersetujuanKRS;