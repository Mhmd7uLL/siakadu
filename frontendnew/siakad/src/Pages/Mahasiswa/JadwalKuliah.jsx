import React, { useState, useEffect } from "react";

const JadwalKuliah = ({ user }) => {
  const [selectedDay, setSelectedDay] = useState("Semua Hari");
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [semester, setSemester] = useState("Ganjil");
  const [tahunAjaran, setTahunAjaran] = useState("2024/2025");

  const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Fetch jadwal dari backend
  useEffect(() => {
    if (!user?.nim) {
      setError("User tidak valid");
      setLoading(false);
      return;
    }

    const fetchJadwal = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `http://localhost:5000/api/jadwal/${user.nim}?semester=${semester}&tahun_ajaran=${tahunAjaran}`
        );

        if (!res.ok) {
          throw new Error("Gagal mengambil jadwal");
        }

        const data = await res.json();
        setJadwal(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching jadwal:", err);
        setError(err.message);
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

  // Format waktu
  const formatTime = (time) => {
    if (!time) return "-";
    return time.slice(0, 5); // 08:00:00 -> 08:00
  };

  // Hitung total SKS
  const totalSKS = jadwal.reduce((sum, item) => sum + parseInt(item.sks || 0), 0);

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
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>
        </div>
        <div className="col-md-4 bg-white">
          <label className="form-label bg-white">Tahun Ajaran</label>
          <select
            className="form-select"
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
          >
            <option value="2024/2025">2024/2025</option>
            <option value="2025/2026">2025/2026</option>
          </select>
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