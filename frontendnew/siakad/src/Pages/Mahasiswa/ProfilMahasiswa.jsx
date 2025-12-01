import React from "react";

const ProfilMahasiswa = ({ user }) => {
  return (
    <div className="d-flex flex-column gap-3">

      {/* PROFIL MHS */}
      <div className="d-flex justify-content-around gap-3">

        {/* INFORMASI UMUM */}
        <div className="p-4 border mt-3 bg-white rounded-4 w-75">

          <div className="d-flex justify-content-between bg-white">
            <h4 className="mb-2 bg-white">Profil Mahasiswa</h4>
            <button className="bg-color1 bg-hover1 px-4 py-1 rounded-3">
              E-KTM
            </button>
          </div>

          <hr></hr>

          <div className="bg-white">
            <h1
              className="d-flex justify-content-center bg-primary mx-auto rounded-circle align-items-center text-white"
              style={{ height: "70px", width: "70px" }}
            >
              M
            </h1>
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">Nama : </strong> {user.nama}
            </p>
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">NIM :</strong> 1234567890
            </p>
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">Email :</strong> {user.email}
            </p>
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">Program Studi :</strong> Teknik
              Informatika
            </p>
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">Angkatan :</strong> 2022
            </p>
          </div>
        </div>

        {/* DOMISILI & STATUS */}
        <div
          className="p-4 border mt-3 bg-white rounded-4 d-flex flex-column"
          style={{ width: "30%" }}
        >
          <div className="bg-white rounded-4">
            <h4 className="bg-white">Domisili</h4>
            <hr></hr>
            <p className="bg-white">
              <strong className="bg-white">Alamat:</strong> Jl. Merdeka No. 123,
              Jakarta
            </p>
            <p className="bg-white">
              <strong className="bg-white">No. Telepon:</strong> 081234567890
            </p>
          </div>
          <div className="mt-4 bg-white rounded-4">
            <h4 className="bg-white">Status Mahasiswa</h4>
            <hr></hr>
            <p className="bg-white">
              <strong className="bg-white">Status:</strong> Aktif
            </p>
          </div>
        </div>
      </div>

      {/* UKT */}
      <div className="mb-4">
        <div className="p-4 border mt-3 bg-white rounded-4 w-100 mx-auto">
          <div className="d-flex justify-content-between bg-white">
            <h4 className="mb-2 bg-white">Informasi UKT</h4>
            <h6 className="bg-white">
              Status Pembayaran :{" "}
              <span className="bg-success text-white p-1 px-3 rounded-3 my-0">Lunas</span>
            </h6>
          </div>
          <hr></hr>
          <div className="bg-white">
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">Jumlah UKT :</strong> Rp 9.500.000
            </p>
            <p className="bg-white border p-2 rounded-3 d-flex justify-content-between w-100 mx-auto">
              <strong className="bg-white">Tanggal Pembayaran :</strong> 30
              September 2024
            </p>
          </div>
          <div className="bg-white d-flex justify-content-between ">
            <button className="bg-color1 bg-hover1 px-4 py-1 rounded-3 mt-3">
              Cetak Bukti Pembayaran
            </button>
            <buttoN className="bg-color1 bg-hover1 px-4 py-1 rounded-3 mt-3">Petunjuk pembayaran</buttoN>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilMahasiswa;
