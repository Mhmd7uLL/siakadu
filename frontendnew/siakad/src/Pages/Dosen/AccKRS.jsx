import React, { useState } from 'react';
import './styles/acckrs.css'; // <--- JANGAN LUPA IMPORT FILE CSS INI

const PersetujuanKRS = () => {
  // Data Mockup untuk tabel
  const [submissions, setSubmissions] = useState([
    { id: 1, nim: '2021001', name: 'Budi Santoso', semester: 5, totalSKS: 21, jmlMK: 7, status: 'Menunggu' },
    { id: 2, nim: '2021002', name: 'Siti Aminah', semester: 5, totalSKS: 20, jmlMK: 6, status: 'Menunggu' },
    { id: 3, nim: '2021003', name: 'Andi Wijaya', semester: 5, totalSKS: 18, jmlMK: 6, status: 'Disetujui' },
    { id: 4, nim: '2021004', name: 'Dewi Lestari', semester: 5, totalSKS: 24, jmlMK: 8, status: 'Ditolak' },
    { id: 5, nim: '2021005', name: 'Rizki Pratama', semester: 5, totalSKS: 20, jmlMK: 7, status: 'Menunggu' },
  ]);

  // Data Mockup untuk Ringkasan Kartu
  const summaryData = {
    menunggu: 3,
    disetujui: 1,
    ditolak: 1,
  };

  // Fungsi untuk mendapatkan nama class badge
  const getStatusClass = (status) => {
    switch (status) {
      case 'Menunggu':  return 'badge-menunggu';
      case 'Disetujui': return 'badge-disetujui';
      case 'Ditolak':   return 'badge-ditolak';
      default:          return 'badge-default';
    }
  };

  return (
    <div className="krs-wrapper">
      <h2 className="krs-header">Persetujuan KRS Mahasiswa</h2>

      {/* --- 1. Kartu Ringkasan (Summary Cards) --- */}
      <div className="summary-cards-container">
        
        {/* Card Menunggu */}
        <div className="summary-card menunggu">
          <div className="card-value">{summaryData.menunggu}</div>
          <div className="card-label">Menunggu Persetujuan</div>
          <div className="card-icon">🕒</div>
        </div>

        {/* Card Disetujui */}
        <div className="summary-card disetujui">
          <div className="card-value">{summaryData.disetujui}</div>
          <div className="card-label">Sudah Disetujui</div>
          <div className="card-icon">✅</div>
        </div>

        {/* Card Ditolak */}
        <div className="summary-card ditolak">
          <div className="card-value">{summaryData.ditolak}</div>
          <div className="card-label">Ditolak</div>
          <div className="card-icon">❌</div>
        </div>
      </div>
      
      {/* --- 2. Tabel Daftar Pengajuan --- */}
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
              {submissions.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>{item.nim}</td>
                  <td>{item.name}</td>
                  <td>{item.semester}</td>
                  <td>{item.totalSKS}</td>
                  <td>{item.jmlMK}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                        {item.status}
                    </span>
                  </td>
                  <td className="action-buttons">
                    <button className="btn-detail">Detail</button>
                    {/* Tombol Setuju dan Tolak hanya muncul jika status Menunggu */}
                    {item.status === 'Menunggu' && (
                        <>
                            <button className="btn-setuju">Setuju</button>
                            <button className="btn-tolak">Tolak</button>
                        </>
                    )}
                    {/* Jika Disetujui/Ditolak, mungkin hanya tombol detail yang ada */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- 3. Catatan Penting --- */}
      <div className="notes-section">
        <h3 className="notes-title">Catatan Penting</h3>
        <ul>
          <li>Maksimal SKS yang dapat diambil mahasiswa adalah **24 SKS**</li>
          <li>Persetujuan KRS harus dilakukan **sebelum perkuliahan dimulai**</li>
          <li>Pastikan memeriksa **IPK mahasiswa** sebelum menyetujui KRS</li>
          <li>Mahasiswa dengan IPK dibawah 2.00 maksimal mengambil **18 SKS**</li>
        </ul>
      </div>
    </div>
  );
};

export default PersetujuanKRS;