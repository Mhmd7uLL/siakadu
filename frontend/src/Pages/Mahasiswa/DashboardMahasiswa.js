import React, { useEffect, useState } from 'react';
import NavbarMahasiswa from './NavbarMahasiswa';
import ProfilMahasiswa from './ProfilMahasiswa';
import FormKRS from './FormKRS';
import JadwalKuliah from './JadwalKuliah';
import PengumpulanTugas from './PengumpulanTugas';
import KHS from './KHS';

const DashboardMahasiswa = ({ user }) => {
    const [menu, setMenu] = useState('profil');
    const [mahasiswa, setMahasiswa] = useState([]);
    const [search, setSearch] = useState('');
  
    useEffect(() => {
      fetch('/api/mahasiswa')
        .then(res => res.json())
        .then(data => setMahasiswa(data));
    }, []);
  
    if (!user || user.role !== 'mahasiswa') return null;

    const filteredMahasiswa = mahasiswa.filter(m =>
        m.nama.toLowerCase().includes(search.toLowerCase())
    );

    const totalMahasiswa = mahasiswa.length;
    const avgGPA = mahasiswa.length
        ? (mahasiswa.reduce((sum, m) => sum + m.gpa, 0) / mahasiswa.length).toFixed(2)
        : 0;

    return (
        <div>
            <NavbarMahasiswa onMenuSelect={setMenu} />
            <h1>Dashboard Mahasiswa</h1>
            <div>
                <p>Total Mahasiswa: {totalMahasiswa}</p>
                <p>Rata-rata GPA: {avgGPA}</p>
            </div>
            <input
                type="text"
                placeholder="Cari nama mahasiswa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <table>
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>NIM</th>
                        <th>Jurusan</th>
                        <th>GPA</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredMahasiswa.map(m => (
                        <tr key={m.nim}>
                            <td>{m.nama}</td>
                            <td>{m.nim}</td>
                            <td>{m.jurusan}</td>
                            <td>{m.gpa}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {menu === 'profil' && <ProfilMahasiswa user={user} />}
            {menu === 'tambahKRS' && <FormKRS />}
            {menu === 'cekJadwal' && <JadwalKuliah />}
            {menu === 'pengumpulanTugas' && <PengumpulanTugas />}
            {menu === 'khs' && <KHS />}
        </div>
    );
};

export default DashboardMahasiswa;