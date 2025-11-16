import React from 'react';

const NavbarMahasiswa = ({ onMenuSelect }) => (
  <nav>
    <ul>
      <li onClick={() => onMenuSelect('tambahKRS')}>Tambah KRS</li>
      <li onClick={() => onMenuSelect('profil')}>Profil</li>
      <li onClick={() => onMenuSelect('cekJadwal')}>Cek Jadwal</li>
      <li onClick={() => onMenuSelect('pengumpulanTugas')}>Pengumpulan Tugas</li>
      <li onClick={() => onMenuSelect('khs')}>KHS</li>
    </ul>
  </nav>
);

export default NavbarMahasiswa;