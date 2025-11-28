import React from 'react';
import './styles/tambahtugas.css'; 

const TugasData = [
  { id: 1, judul: 'Tugas UTS Pemrograman Web', kelas: 'TI-3A', deadline: '23 Nov 2025', status: 'Aktif' },
  { id: 2, judul: 'Project Basis Data', kelas: 'TI-3B', deadline: '25 Nov 2025', status: 'Aktif' },
  { id: 3, judul: 'Analisis Keamanan Jaringan', kelas: 'TI-4A', deadline: '20 Nov 2025', status: 'Selesai' },
];

const ManajemenTugasPage = () => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'Aktif':   return 'badge-aktif';
      case 'Selesai': return 'badge-selesai';
      default:        return 'badge-default';
    }
  };

  return (
    <div className="tugas-wrapper">
      <h2 className="tugas-header">Tambah Tugas</h2>

      <div className="top-tugas-grid">
        
        <div className="card form-tugas-card">
          <h3 className="card-title">Tambah Tugas Baru</h3>
          
          <form>
            <div className="form-group">
              <label htmlFor="kelas">Kelas</label>
              <select id="kelas" className="form-input">
                <option>Pilih Kelas</option>
                <option>TI-3A</option>
                <option>TI-3B</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="judul">Judul Tugas</label>
              <input type="text" id="judul" className="form-input" placeholder="Masukkan judul tugas..." />
            </div>

            <div className="form-group">
              <label htmlFor="deskripsi">Deskripsi</label>
              <textarea id="deskripsi" className="form-input textarea-input" placeholder="Deskripsi tugas..."></textarea>
            </div>

            <div className="form-group">
              <label htmlFor="deadline">Deadline</label>
              <input type="date" id="deadline" className="form-input" placeholder="mm/dd/yyyy --:-- --" />
            </div>

            <div className="form-group file-group">
              <label>File Lampiran (Opsional)</label>
              <input type="file" />
            </div>

            <button type="submit" className="btn-tambah-tugas">Tambah Tugas</button>
          </form>
        </div>

        <div className="card daftar-tugas-card">
          <h3 className="card-title">Daftar Tugas</h3>
          
          <div className="table-responsive-tugas">
            <table className="tugas-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Judul Tugas</th>
                  <th>Kelas</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {TugasData.map((tugas, index) => (
                  <tr key={tugas.id}>
                    <td>{index + 1}</td>
                    <td>{tugas.judul}</td>
                    <td>{tugas.kelas}</td>
                    <td>{tugas.deadline}</td>
                    <td>
                      <span className={`tugas-badge ${getStatusClass(tugas.status)}`}>
                        {tugas.status}
                      </span>
                    </td>
                    <td className="tugas-actions">
                      <button className="btn-detail-tugas">Detail</button>
                      <button className="btn-delete-tugas">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bottom-stats-grid">
        
        <div className="card stat-card">
          <div className="stat-value active-count">2</div>
          <div className="stat-label">Total Tugas Aktif</div>
        </div>

        <div className="card stat-card">
          <div className="stat-value deadline-count">1</div>
          <div className="stat-label">Tugas Deadline Hari Ini</div>
        </div>

        <div className="card stat-card">
          <div className="stat-value review-count">8</div>
          <div className="stat-label">Menunggu Penilaian</div>
        </div>
      </div>
    </div>
  );
};

export default ManajemenTugasPage;