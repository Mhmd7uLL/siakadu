import React, { useState } from 'react';
import styles from './NavbarMHS.module.css';

const NavbarMahasiswa = ({ onMenuSelect }) => {
  const [activeMenu, setActiveMenu] = useState('');

  const handleSelect = (menu) => {
    setActiveMenu(menu);
    onMenuSelect(menu);
  };

  return (
    <nav className={styles.sidebar}>
      {/* Logo / Header */}
      <div className={styles.logoHeader}>
        SIAKADU
        <span>Mahasiswa</span>
      </div>

      {/* Menu */}
      <ul className={styles.navList}>
        <li
          className={activeMenu === 'tambahKRS' ? styles.active : ''}
          onClick={() => handleSelect('tambahKRS')}
        >
          Tambah KRS
        </li>

        <li
          className={activeMenu === 'profil' ? styles.active : ''}
          onClick={() => handleSelect('profil')}
        >
          Profil
        </li>

        <li
          className={activeMenu === 'cekJadwal' ? styles.active : ''}
          onClick={() => handleSelect('cekJadwal')}
        >
          Cek Jadwal
        </li>

        <li
          className={activeMenu === 'pengumpulanTugas' ? styles.active : ''}
          onClick={() => handleSelect('pengumpulanTugas')}
        >
          Pengumpulan Tugas
        </li>

        <li
          className={activeMenu === 'khs' ? styles.active : ''}
          onClick={() => handleSelect('khs')}
        >
          KHS
        </li>
      </ul>

      {/* Profile User */}
      <div className={styles.profileInfo}>
        <div className={styles.avatar}>M</div>
        <div className={styles.profileText}>
          <h4>Mahasiswa</h4>
          <p>TI 2045</p>
        </div>
      </div>
    </nav>
  );
};

export default NavbarMahasiswa;
