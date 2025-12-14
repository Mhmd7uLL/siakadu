import React, { useEffect, useState } from 'react';
import NavbarDosen from './NavbarDosen';
import AccKRS from './AccKRS';
import Absensi from './Absensi';
import TambahTugas from './TambahTugas';
import InputNilai from './InputNilai';
import styles from './Dashboard.module.css';
import './styles/profildosen.css';

const API_BASE = "http://localhost:5000/api";


const DashboardDosen = ({ user: propUser, onLogout }) => {
  const [menu, setMenu] = useState('dashboard');
  const [user, setUser] = useState(propUser || null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // jika parent tidak memberi user (mis. setelah reload), ambil dari localStorage
  useEffect(() => {
    if (!propUser) {
      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    } else {
      setUser(propUser);
    }
  }, [propUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.id) return;
      setLoadingProfile(true);
      try {
        const res = await fetch(`${API_BASE}/dosen/${user.id}`); 
        if (!res.ok) {
          setLoadingProfile(false);
          return;
        }
        const full = await res.json().catch(() => null);
        if (full) {
          setUser((prev) => ({ ...(prev || {}), ...full }));
          try {
            localStorage.setItem('user', JSON.stringify({ ...(user || {}), ...(full || {}) }));
          } catch {}
        }
      } catch (err) {
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user && user.id]);

  
  const profileData = {
    name: (user && (user.nama || user.name)) || 'Contoh Nama Dosen',
    nip: (user && user.nip) || '0123456789',
    status: 'Dosen Tetap',
    email: (user && user.email) || 'namadosen@university.ac.id',
    phone: (user && user.phone) || '+62 812-3456-7890',
    address: (user && user.address) || 'Jl. Pendidikan No. 123, Jakarta Selatan, DKI Jakarta 12345',
    programStudi: (user && user.prodi) || 'Teknik Informatika',
    bidangKeahlian: (user && user.bidangKeahlian) || 'Rekayasa Perangkat Lunak, Basis Data, Pemrograman Web',
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

  const renderContent = () => {
    switch (menu) {
      case 'accKRS':
        if (!user || !user.id) return <p>Data dosen tidak tersedia. Silakan login ulang.</p>;
        return <AccKRS dosenId={Number(user.id)} user={user} />;
      case 'absensi':
        return <Absensi user={user} />;
      case 'tambahTugas':
        return <TambahTugas user={user} />;
      case 'inputNilai':
        return <InputNilai user={user} />;
      default:
        return (
          <div className="profil-wrapper">
            <h2 className="profil-header">Profil Dosen</h2>

            <div className="top-section-grid">

              <div className="card profil-card">
                <div className="avatar-circle">{(profileData.name || 'Dosen').split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
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
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <NavbarDosen user={user} onMenuSelect={setMenu} activeMenu={menu} onLogout={onLogout} />

      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <h1>{menu.charAt(0).toUpperCase() + menu.slice(1)}</h1>
        </header>

        <div className={styles.contentArea}>
          {loadingProfile ? <p>Memuat profil...</p> : renderContent()}
        </div>
      </main>
    </div>
  );
};

export default DashboardDosen;