import React from 'react';
import styles from './NavbarDosen.module.css'; 

const NavbarDosen = ({ user, onMenuSelect, activeMenu }) => {
  return (
    <nav className={styles.sidebar}>
      
      <div className={styles.logoHeader}>
        Siakadu
        <span>Academic Excellence</span>
      </div>

      <ul className={styles.navList}>
        
        <li 
          className={activeMenu === 'dashboard' ? styles.active : ''}
          onClick={() => onMenuSelect('dashboard')}
        >
          Dashboard
        </li>
        
        <li 
          className={activeMenu === 'profil' ? styles.active : ''}
          onClick={() => onMenuSelect('profil')}
        >
          Profil
        </li>
        
        <li 
          className={activeMenu === 'absensi' ? styles.active : ''}
          onClick={() => onMenuSelect('absensi')}
        >
          Absensi
        </li>
        
        <li 
          className={activeMenu === 'tambahTugas' ? styles.active : ''}
          onClick={() => onMenuSelect('tambahTugas')}
        >
          Tambah Tugas
        </li>
        
        <li 
          className={activeMenu === 'inputNilai' ? styles.active : ''}
          onClick={() => onMenuSelect('inputNilai')}
        >
          Input Nilai
        </li>

        {user.canAccKRS && (
          <li
            className={activeMenu === 'accKRS' ? styles.active : ''}
            onClick={() => onMenuSelect('accKRS')}
          >
            ACC KRS
          </li>
        )}
      </ul>

      <div className={styles.profileInfo}>
        <div className={styles.avatar}>
          {user.nama.substring(0, 2).toUpperCase()}
        </div>
        <div className={styles.profileText}>
          <h4>{user.nama}</h4>
          <p>Faculty Member</p>
        </div>
      </div>
    </nav>
  );
}

export default NavbarDosen;