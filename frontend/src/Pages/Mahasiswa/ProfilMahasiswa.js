import React from 'react';

const ProfilMahasiswa = ({ user }) => {
    return (
        <div className="p-4 border mt-3">
            <h3>🗂️ Profil Mahasiswa</h3>
            <p>Nama: {user.nama}</p>
            <p>Role: {user.role}</p>
            <p>Email: {user.email}</p>
            <p>Halaman ini sedang dalam pengembangan.</p>
        </div>
    );
};

export default ProfilMahasiswa;