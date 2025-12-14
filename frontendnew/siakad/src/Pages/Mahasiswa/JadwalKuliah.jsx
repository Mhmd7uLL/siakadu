import React, { useState, useEffect } from "react";
const API_BASE = "http://localhost:5000/api";

const JadwalKuliah = ({ user }) => {
  const [selectedDay, setSelectedDay] = useState("Semua Hari");
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [semester, setSemester] = useState("1"); 
  const [tahunAjaran, setTahunAjaran] = useState("2025/2026");

  const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  useEffect(() => {
    if (!user?.nim) {
      setError("User tidak valid");
      setLoading(false);
      return;
    }

    const fetchJadwal = async () => {
      try {
        setLoading(true);
        setError(null);

        const nim = encodeURIComponent(user.nim);
        const ta = encodeURIComponent(tahunAjaran);
        const url = `${API_BASE}/jadwal/${nim}?semester=${encodeURIComponent(semester)}&tahun_ajaran=${ta}`;

        const res = await fetch(url);
        if (!res.ok) {
          let body = {};
          try { body = await res.json(); } catch {}
          throw new Error(body.error || body.message || `HTTP ${res.status}`);
        }

        const data = await res.json();


        const normalized = Array.isArray(data)
          ? data.map((item) => ({
              hari: item.hari ?? item.day ?? null,
              kode: item.kode ?? item.kode_matkul ?? item.code ?? "",
              nama_matkul: item.nama_matkul ?? item.nama ?? item.name ?? "",
              sks: Number(item.sks ?? item.SKS ?? 0),
              waktu_mulai: item.waktu_mulai ?? item.start_time ?? null,
              waktu_selesai: item.waktu_selesai ?? item.end_time ?? null,
              ruang: item.ruang ?? item.room ?? "",
              nama_dosen: item.nama_dosen ?? item.nama ?? item.dosen ?? "-",
              status_krs: item.status_krs ?? item.status ?? null,
            }))
          : [];

        setJadwal(normalized);
        setError(null);
      } catch (err) {
        console.error("Error fetching jadwal:", err);
        setError(err.message || "Gagal mengambil jadwal");
        setJadwal([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJadwal();
  }, [user?.nim, semester, tahunAjaran]);

  // Filter jadwal berdasarkan hari
  const filteredSchedule =
    selectedDay === "Semua Hari"
      ? jadwal
      : jadwal.filter((item) => item.hari === selectedDay);

  // Format waktu (lebih robust terhadap berbagai format)
  const formatTime = (time) => {
    if (!time) return "-";
    if (typeof time === "string") {
      const m = time.match(/^(\d{2}:\d{2})/);
      if (m) return m[1];
      return time.slice(0, 5);
    }
    try {
      const d = new Date(time);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "-";
    }
  };

  // Hitung total SKS dari jadwal (semua entry yang diterima)
  const totalSKS = jadwal.reduce((sum, item) => sum + (Number(item.sks) || 0), 0);

  return (
    <div className="p-4 border mt-3 bg-white rounded-4">
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white">
        <h4 className="bg-white mb-0">Jadwal Kuliah - {user?.nama}</h4>
        <span className="badge bg-primary">
          {jadwal.length} Mata Kuliah | {totalSKS} SKS
        </span>
      </div>

      {/* Filter Semester & Tahun Ajaran */}
      <div className="row mb-3 bg-white">
        <div className="col-md-4 bg-white">
          <label className="form-label bg-white">Semester</label>
          <select
            className="form-select"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="1">Ganjil (1)</option>
            <option value="2">Genap (2)</option>
          </select>
        </div>
        <div className="col-md-4 bg-white">
          <label className="form-label bg-white">Tahun Ajaran</label>
          {/* Hanya tampilkan 2025/2026 agar tidak membingungkan */}
          <select
            className="form-select"
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
          >
            <option value="2025/2026">2025/2026</option>
          </select>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
            Menampilkan jadwal mulai dari tahun ajaran 2025/2026.
          </div>
        </div>
        <div className="col-md-4 bg-white">
          <label className="form-label bg-white">Filter Hari</label>
          <select
            className="form-select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option>Semua Hari</option>
            {daysOfWeek.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading & Error State */}
      {loading && <p className="bg-white">Loading jadwal...</p>}
      {error && <p className="bg-white text-danger">Error: {error}</p>}

      {/* Peringatan jika KRS belum diapprove */}
      {!loading && !error && jadwal.length === 0 && (
        <div className="alert alert-warning bg-warning" role="alert">
          <strong>⚠️ Jadwal Belum Tersedia</strong>
          <br />
          Pastikan KRS Anda sudah disubmit dan disetujui oleh dosen pembimbing akademik.
        </div>
      )}

      {/* Tabel Jadwal */}
      {!loading && !error && jadwal.length > 0 && (
        <>
          <table className="table table-hover bg-white">
            <thead>
              <tr>
                <th className="bg-primary text-white">Hari</th>
                <th className="bg-primary text-white">Kode</th>
                <th className="bg-primary text-white">Mata Kuliah</th>
                <th className="bg-primary text-white">SKS</th>
                <th className="bg-primary text-white">Waktu</th>
                <th className="bg-primary text-white">Ruang</th>
                <th className="bg-primary text-white">Dosen</th>
              </tr>
            </thead>

            <tbody>
              {filteredSchedule.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center bg-white">
                    Tidak ada jadwal pada {selectedDay}
                  </td>
                </tr>
              ) : (
                filteredSchedule.map((item, index) => (
                  <tr key={index}>
                    <td className="bg-white">{item.hari}</td>
                    <td className="bg-white">
                      <code>{item.kode}</code>
                    </td>
                    <td className="bg-white">{item.nama_matkul}</td>
                    <td className="bg-white text-center">{item.sks}</td>
                    <td className="bg-white">
                      {formatTime(item.waktu_mulai)} - {formatTime(item.waktu_selesai)}
                    </td>
                    <td className="bg-white">{item.ruang}</td>
                    <td className="bg-white">{item.nama_dosen || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Ringkasan per Hari */}
          <div className="mt-4 bg-white">
            <h5 className="bg-white">Ringkasan Jadwal</h5>
            <div className="row bg-white">
              {daysOfWeek.map((day) => {
                const daySchedule = jadwal.filter((j) => j.hari === day);
                return (
                  <div key={day} className="col-md-2 mb-2 bg-white">
                    <div className="card text-center">
                      <div className="card-body">
                        <h6 className="card-title">{day}</h6>
                        <p className="card-text mb-0">
                          <strong>{daySchedule.length}</strong> kelas
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default JadwalKuliah;