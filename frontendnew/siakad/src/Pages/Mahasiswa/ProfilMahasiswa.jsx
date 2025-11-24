import React from 'react';

const ProfilMahasiswa = ({ user }) => {
    return (
        <div className="p-4 border mt-3 bg-white rounded-4">
            <h3 className='bg-white'>🗂️ Profil Mahasiswa</h3>
            <p className='bg-white'>Nama: {user.nama}</p>
            <p className='bg-white'>Role: {user.role}</p>
            <p className='bg-white'>Email: {user.email}</p>
            <p className='bg-white'>Halaman ini sedang dalam pengembangan.</p>
        </div>
    );
};

export default ProfilMahasiswa;