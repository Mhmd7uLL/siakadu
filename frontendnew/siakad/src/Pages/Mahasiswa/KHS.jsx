import React, { useState } from "react";

const FormKHS = () => {
  const [selectedSemester, setSelectedSemester] = useState("Genap 2024/2025");

  // Data KHS berdasarkan semester
  const khsData = {
    "Genap 2024/2025": [
      { no: 1, kode: "CS101", nama: "Pengantar Pemrograman", sks: 3, nilai: "A" },
      { no: 2, kode: "CS102", nama: "Struktur Data", sks: 4, nilai: "B+" },
      { no: 3, kode: "CS103", nama: "Basis Data", sks: 3, nilai: "A-" },
    ],

    "Ganjil 2025/2026": [] // kosong
  };

  const dataSemesterTerpilih = khsData[selectedSemester];

  return (
    <div className="d-flex justify-content-around gap-3">

      {/* FORM KHS */}
      <div className="p-4 border mt-3 bg-white rounded-4 w-75">
        <h4 className="mb-4 bg-white">Kartu Hasil Studi Mahasiswa</h4>
        <form className="bg-white">
          <div className="mb-3 bg-white">
            <label htmlFor="semester" className="form-label bg-white">
              Semester
            </label>
            <select
              className="form-select bg-white"
              id="semester"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              <option>Genap 2024/2025</option>
              <option>Ganjil 2025/2026</option>
            </select>
          </div>

          <div className="mb-3 bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th className="bg-primary text-white">No.</th>
                  <th className="bg-primary text-white">Kode</th>
                  <th className="bg-primary text-white">Mata Kuliah</th>
                  <th className="bg-primary text-white">SKS</th>
                  <th className="bg-primary text-white">Nilai</th>
                </tr>
              </thead>

              <tbody>
                {/* Jika data kosong → tampilkan pesan */}
                {dataSemesterTerpilih.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center bg-white fw-bold">
                      KHS belum keluar semester ini
                    </td>
                  </tr>
                ) : (
                  dataSemesterTerpilih.map((item) => (
                    <tr key={item.no}>
                      <td className="bg-white">{item.no}</td>
                      <td className="bg-white">{item.kode}</td>
                      <td className="bg-white">{item.nama}</td>
                      <td className="bg-white">{item.sks}</td>
                      <td className="bg-white">{item.nilai}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </form>
      </div>

      {/* RINGKASAN KHS */}
      <div
        className="p-4 border mt-3 bg-white rounded-4 d-flex flex-column align-items-center"
        style={{ width: "30%" }}
      >
        <h4 className="bg-white">Rekap KHS</h4>

        <div className="d-flex gap-3 align-items-center bg-white">
          <span className="bg-white">Semester :</span>

          <p
            className="bg-primary text-center p-1 px-3 rounded-4 text-white fw-bold"
            style={{ fontSize: "12px", margin: 0 }}
          >
            {selectedSemester}
          </p>
        </div>
        <hr />

        {dataSemesterTerpilih.length > 0 ? (
          <>
            <div className="d-flex justify-content-between bg-white gap-3 border pt-3 mb-2 px-4 rounded-4 w-100 fw-bold">
              <p className="bg-white">IP Semester: 3.75</p>
              <p className="bg-white">IPK: 3.65</p>
            </div>
            <p className="bg-white">SKS Semester: 10</p>
          </>
        ) : (
          <p className="text-center text-muted bg-white">
            Tidak ada data KHS untuk semester ini
          </p>
        )}
      </div>
    </div>
  );
};

export default FormKHS;
