import React from 'react';
import './styles/profildosen.css';

const ProfilDosenPage = () => {
  const profileData = {
    name: 'Contoh Nama Dosen',
    nip: '0123456789',
    status: 'Dosen Tetap',
    email: 'namadosen@university.ac.id',
    phone: '+62 812-3456-7890',
    address: 'Jl. Pendidikan No. 123, Jakarta Selatan, DKI Jakarta 12345',
    programStudi: 'Teknik Informatika',
    bidangKeahlian: 'Rekayasa Perangkat Lunak, Basis Data, Pemrograman Web',
  };

  const educationHistory = [
    { year: '2015 - 2018', degree: 'S3 - Ilmu Komputer', institution: 'Universitas Indonesia' },
    { year: '2010 - 2012', degree: 'S2 - Teknik Informatika', institution: 'Institut Teknologi Bandung' },
    { year: '2006 - 2010', degree: 'S1 - Teknik Informatika', institution: 'Universitas Gadjah Mada' },
  ];

  const recentResearch = [
    { title: 'Machine Learning untuk Prediksi Hasil Belajar Mahasiswa', year: 2024 },
    { title: 'Optimasi Algoritma Pencarian Data pada Big Data', year: 2023 },
    { title: 'Sistem Rekomendasi Berbasis Collaborative Filtering', year: 2023 },
  ];

  return (
    <div className="profil-wrapper">
      <h2 className="profil-header">Profil Dosen</h2>

      <div className="top-section-grid">
        
        <div className="card profil-card">
          <div className="avatar-circle">AW</div>
          <div className="profil-name">{profileData.name}</div>
          <div className="profil-status">{profileData.status}</div>
          <div className="profil-nip">NIP: {profileData.nip}</div>
          <button className="btn-edit-profile">Edit Profil</button>
        </div>

        <div className="card detail-card">
          <h3 className="detail-title">Informasi Detail</h3>
          
          <div className="detail-item">
            <span className="detail-icon">📧</span>
            <div className="detail-text">
              <div className="detail-label">Email</div>
              <div className="detail-value">{profileData.email}</div>
            </div>
          </div>

          <div className="detail-item">
            <span className="detail-icon">📞</span>
            <div className="detail-text">
              <div className="detail-label">Nomor Telepon</div>
              <div className="detail-value">{profileData.phone}</div>
            </div>
          </div>
          
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <div className="detail-text">
              <div className="detail-label">Alamat</div>
              <div className="detail-value">{profileData.address}</div>
            </div>
          </div>
          
          <div className="detail-item">
            <span className="detail-icon">📚</span>
            <div className="detail-text">
              <div className="detail-label">Program Studi</div>
              <div className="detail-value">{profileData.programStudi}</div>
            </div>
          </div>
          
          <div className="detail-item">
            <span className="detail-icon">💻</span>
            <div className="detail-text">
              <div className="detail-label">Bidang Keahlian</div>
              <div className="detail-value">{profileData.bidangKeahlian}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-section-grid">
        
        <div className="card education-card">
          <h3 className="card-title">Riwayat Pendidikan</h3>
          <ul className="education-list">
            {educationHistory.map((edu, index) => (
              <li key={index} className="education-item">
                <div className="edu-year">{edu.year}</div>
                <div className="edu-degree">{edu.degree}</div>
                <div className="edu-institution">{edu.institution}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card research-card">
          <h3 className="card-title">Penelitian Terbaru</h3>
          <ul className="research-list">
            {recentResearch.map((res, index) => (
              <li key={index} className="research-item">
                <div className="research-title">{res.title}</div>
                <div className="research-year">{res.year}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
};

export default ProfilDosenPage;