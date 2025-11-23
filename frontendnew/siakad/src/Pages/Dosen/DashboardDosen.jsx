import React, { useEffect, useState } from 'react';
import NavbarDosen from './NavbarDosen';
import ProfilDosen from './ProfilDosen';
import AccKRS from './AccKRS';
import Absensi from './Absensi';
import TambahTugas from './TambahTugas';
import InputNilai from './InputNilai';
import styles from './Dashboard.module.css';

const DashboardDosen = ({ user }) => {
  const [dosen, setDosen] = useState([]);
  const [search, setSearch] = useState('');
  const [menu, setMenu] = useState('dashboard');

  useEffect(() => {
    // Replace with your API call
    const mockDosen = [
      { id: 1, nama: 'Dr. Andi', jumlahMahasiswaBimbingan: 5 },
      { id: 2, nama: 'Prof. Budi', jumlahMahasiswaBimbingan: 8 },
      { id: 3, nama: 'Ibu Sari', jumlahMahasiswaBimbingan: 3 },
    ]
    setDosen(mockDosen);

    //fetch('/api/dosen')
      //.then(res => res.json())
      //.then(data => setDosen(data));
  }, []);

  if (!user || user.role !== 'dosen') return null;

  const filteredDosen = dosen.filter(d =>
    d.nama.toLowerCase().includes(search.toLowerCase())
  );

  const totalDosen = dosen.length;
  const avgBimbingan = dosen.length
    ? (dosen.reduce((sum, d) => sum + d.jumlahMahasiswaBimbingan, 0) / dosen.length).toFixed(2)
    : 0;

    const renderContent = () => {
      switch (menu) {
        case 'profil':
          return <ProfilDosen user={user} />;
        case 'accKRS':
          return user.canAccKRS ? <AccKRS /> : <p>Anda tidak memiliki akses ke fitur ini.</p>;
        case 'absensi':
          return <Absensi />;
        case 'tambahTugas':
          return <TambahTugas />;
        case 'inputNilai':
          return <InputNilai />;
        case 'dashboard':
        default:
          return (
            <div className={styles.dashboardHome}>
            <h2>Selamat datang kembali, {user.nama || 'Dosen'}! 👋</h2>
            <p>Ini adalah ringkasan aktivitas akademik Anda.</p>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h4>Total Dosen</h4>
                <p>{totalDosen}</p>
              </div>
              <div className={styles.statCard}>
                <h4>Rata-rata Bimbingan</h4>
                <p>{avgBimbingan}</p>
              </div>
            </div>

            <div className={styles.listContainer}>
              <h3>Daftar Dosen</h3>
              <input
                type="text"
                placeholder="Cari nama dosen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              <table className={styles.dosenTable}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Jumlah Mahasiswa Bimbingan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDosen.map(d => (
                    <tr key={d.id}>
                      <td>{d.nama}</td>
                      <td>{d.jumlahMahasiswaBimbingan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
      }
    };

  return (
    <div className={styles.dashboardContainer}>
      <NavbarDosen user={user} onMenuSelect={setMenu} activeMenu={menu}/>
      
      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <h1>{menu.charAt(0).toUpperCase() + menu.slice(1)}</h1>
        </header>

        <div className={styles.contentArea}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default DashboardDosen;