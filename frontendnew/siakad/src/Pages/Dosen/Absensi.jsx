import React, { useState } from 'react';
import './styles/absensi.css'; 

const AbsensiPage = () => {
  const [students, setStudents] = useState([
    { id: 1, nim: '2021001', name: 'Budi Santoso', status: 'Hadir' },
    { id: 2, nim: '2021002', name: 'Siti Aminah', status: 'Hadir' },
    { id: 3, nim: '2021003', name: 'Andi Wijaya', status: 'Izin' },
    { id: 4, nim: '2021004', name: 'Dewi Lestari', status: 'Hadir' },
    { id: 5, nim: '2021005', name: 'Rizki Pratama', status: 'Alpha' },
    { id: 6, nim: '2021006', name: 'Maya Sari', status: 'Hadir' },
  ]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Hadir': return 'badge-hadir';
      case 'Izin':  return 'badge-izin';
      case 'Alpha': return 'badge-alpha';
      default:      return 'badge-default';
    }
  };

  return (
    <div className="absensi-wrapper">
      <h2 className="absensi-header">Absensi Mahasiswa</h2>

      <div className="absensi-container">
        
        <div className="control-section">
          <h3 className="control-title">Daftar Kehadiran</h3>
          
          <div className="control-actions">
            <select className="control-dropdown">
              <option>TI-3A - Pemrograman Web</option>
              <option>TI-3B - Pemrograman Web</option>
            </select>
            <button className="control-button">
              Simpan Absensi
            </button>
          </div>
        </div>

        <div className="info-box-blue">
          Pertemuan: 8 | Tanggal: 23 November 2025
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
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.nim}</td>
                  <td className="font-bold">{student.name}</td>
                  <td>
                    {/* Menggunakan class CSS kustom untuk badge */}
                    <span className={`status-badge ${getStatusClass(student.status)}`}>
                        {student.status}
                    </span>
                  </td>
                  <td>
                    <select className="action-select" defaultValue={student.status}>
                      <option value="Hadir">Hadir</option>
                      <option value="Izin">Izin</option>
                      <option value="Sakit">Sakit</option>
                      <option value="Alpha">Alpha</option>
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
                    <div className="summary-count hadiran-hadir">4</div>
                </div>
                <div className="summary-item">
                    <div className="summary-label hadiran-izin">Izin</div>
                    <div className="summary-count hadiran-izin">1</div>
                </div>
                <div className="summary-item">
                    <div className="summary-label hadiran-alpha">Alpha</div>
                    <div className="summary-count hadiran-alpha">1</div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AbsensiPage;