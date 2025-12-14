import React, { useEffect, useState } from 'react';
import './styles/absensi.css';

const API_BASE = 'http://localhost:5000/api';
const STATUS_OPTIONS = ['Hadir', 'Izin', 'Sakit', 'Alpha'];

const getStatusClass = (status) => {
  switch (status) {
    case 'Hadir': return 'badge-hadir';
    case 'Izin':  return 'badge-izin';
    case 'Sakit': return 'badge-izin';
    case 'Alpha': return 'badge-alpha';
    default:      return 'badge-default';
  }
};

const AbsensiPage = () => {
  const [rooms, setRooms] = useState([]); // list of rooms from server (objects: {ruang})
  const [selectedRoom, setSelectedRoom] = useState(null); // {ruang, kode, nama_matkul, semester, tahun_ajaran}
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [semester, setSemester] = useState('1');
  const [tahunAjaran, setTahunAjaran] = useState('2025/2026');
  const [pertemuan, setPertemuan] = useState(1);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0,10));

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/ruang/list`);
        if (!res.ok) throw new Error('Gagal mengambil daftar ruang');
        const data = await res.json();
        // Expect data like [{ruang: "R100"}, ...]
        setRooms(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('fetchRooms error', err);
        setError(err.message || 'Gagal mengambil daftar ruang');
        setRooms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedRoom) {
        setStudents([]);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const url = new URL(`${API_BASE}/attendance/students`);
        url.searchParams.set('ruang', selectedRoom.ruang);
        url.searchParams.set('semester', semester);
        url.searchParams.set('tahun_ajaran', tahunAjaran);

        const res = await fetch(url.toString());
        if (!res.ok) {
          const body = await res.json().catch(()=>null);
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const normalized = (Array.isArray(data) ? data : []).map((s, idx) => ({
          id: s.krs_id ?? (s.id ?? idx + 1),
          nim: s.nim,
          name: s.nama || s.name || '-',
          status: 'Hadir'
        }));
        setStudents(normalized);
      } catch (err) {
        console.error('fetchStudents error', err);
        setError(err.message || 'Gagal mengambil daftar mahasiswa');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [selectedRoom, semester, tahunAjaran]);

  const updateStudentStatus = (nim, newStatus) => {
    setStudents(prev => prev.map(s => s.nim === nim ? { ...s, status: newStatus } : s));
  };

  const summaryCounts = students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  const handleSave = async () => {
    if (!selectedRoom) {
      setError('Pilih ruang terlebih dahulu');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ruang: selectedRoom.ruang,
        kode_matkul: selectedRoom.kode || '',
        semester: Number(semester),
        tahun_ajaran: tahunAjaran,
        pertemuan: Number(pertemuan),
        tanggal,
        records: students.map(s => ({ nim: s.nim, status: s.status }))
      };

      const res = await fetch(`${API_BASE}/attendance/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
      alert(body.message || 'Absensi tersimpan');
    } catch (err) {
      console.error('save error', err);
      setError(err.message || 'Gagal menyimpan absensi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absensi-wrapper">
      <h2 className="absensi-header">Absensi Mahasiswa (Berdasarkan Ruang)</h2>

      <div className="absensi-container">
        <div className="control-section">
          <h3 className="control-title">Pilih Ruang</h3>

          <div className="control-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="control-dropdown"
              value={selectedRoom ? selectedRoom.ruang : ''}
              onChange={(e) => {
                const r = e.target.value;
                if (!r) return setSelectedRoom(null);
                const found = rooms.find(x => x.ruang === r);
                // if not found, still set minimal object
                setSelectedRoom(found || { ruang: r, kode: '', nama_matkul: '', semester: Number(semester), tahun_ajaran: tahunAjaran });
              }}
            >
              <option value="">-- Pilih Ruang --</option>
              {rooms.map((r) => (
                <option key={r.ruang} value={r.ruang}>
                  {r.ruang}
                </option>
              ))}
            </select>

            <label>
              Semester:
              <select value={semester} onChange={(e)=>setSemester(e.target.value)} style={{ marginLeft: 6 }}>
                <option value="1">Ganjil (1)</option>
                <option value="2">Genap (2)</option>
              </select>
            </label>

            <label>
              Tahun Ajaran:
              <select value={tahunAjaran} onChange={(e)=>setTahunAjaran(e.target.value)} style={{ marginLeft: 6 }}>
                <option value="2025/2026">2025/2026</option>
              </select>
            </label>

            <label>
              Pertemuan:
              <input type="number" min="1" value={pertemuan} onChange={(e)=>setPertemuan(Number(e.target.value || 1))} style={{ width: 80, marginLeft: 6 }} />
            </label>

            <label>
              Tanggal:
              <input type="date" value={tanggal} onChange={(e)=>setTanggal(e.target.value)} style={{ marginLeft: 6 }} />
            </label>

            <button className="control-button" onClick={handleSave} disabled={saving || !selectedRoom}>
              {saving ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          </div>
        </div>

        {loading && <div className="info-box-blue">Loading...</div>}
        {error && <div className="info-box-red">Error: {error}</div>}

        <div className="info-box-blue">
          {selectedRoom ? `Ruang: ${selectedRoom.ruang} ${selectedRoom.kode ? `| ${selectedRoom.kode} - ${selectedRoom.nama_matkul}` : ''}` : 'Belum ada ruang dipilih'}
        </div>

        <div className="table-wrapper">
          <table className="absensi-table">
            <thead>
              <tr>
                <th>No</th>
                <th>NIM</th>
                <th>Nama Mahasiswa</th>
                <th>Status Kehadiran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>Tidak ada mahasiswa</td></tr>
              ) : students.map((student, index) => (
                <tr key={student.nim}>
                  <td>{index + 1}</td>
                  <td>{student.nim}</td>
                  <td className="font-bold">{student.name}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(student.status)}`}>
                      {student.status}
                    </span>
                  </td>
                  <td>
                    <select className="action-select" value={student.status} onChange={(e) => updateStudentStatus(student.nim, e.target.value)}>
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="summary-section">
          <h4 className="summary-title">Ringkasan Kehadiran</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label hadiran-hadir">Hadir</div>
              <div className="summary-count hadiran-hadir">{summaryCounts['Hadir'] || 0}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label hadiran-izin">Izin</div>
              <div className="summary-count hadiran-izin">{summaryCounts['Izin'] || 0}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label hadiran-alpha">Alpha</div>
              <div className="summary-count hadiran-alpha">{summaryCounts['Alpha'] || 0}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label hadiran-sakit">Sakit</div>
              <div className="summary-count hadiran-sakit">{summaryCounts['Sakit'] || 0}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AbsensiPage;