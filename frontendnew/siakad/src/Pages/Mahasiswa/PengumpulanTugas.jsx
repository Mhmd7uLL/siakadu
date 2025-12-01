import React, { useState } from "react";

const PengumpulanTugas = () => {
  const [selectedCourse, setSelectedCourse] = useState("Semua Mata Kuliah");

  // Data status tugas
  const taskStatus = [
    { matkul: "Pemrograman Dasar", status: "Dinilai", nilai: 85 },
    { matkul: "Struktur Data", status: "Belum Selesai", nilai: "-" },
    { matkul: "Basis Data", status: "Terkirim", nilai: "Menunggu" },
  ];

  // Filter status berdasarkan pilihan
  const filteredStatus =
    selectedCourse === "Semua Mata Kuliah"
      ? taskStatus
      : taskStatus.filter((item) => item.matkul === selectedCourse);

  return (
    <div className="d-flex justify-content-around gap-3">

      {/* SISI KIRI : TUGAS */}
      <div
        className="p-4 border mt-3 bg-white rounded-4 w-75"
      >
        <h4 className="mb-4 bg-white">Pengumpulan Tugas</h4>

        <form className="bg-white">
          {/* Pilihan Mata Kuliah */}
          <div className="mb-3 bg-white">
            <label htmlFor="course" className="form-label bg-white">
              Mata Kuliah
            </label>
            <select
              className="form-select bg-white"
              id="course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option>Semua Mata Kuliah</option>
              <option>Pemrograman Dasar</option>
              <option>Struktur Data</option>
              <option>Basis Data</option>
            </select>
          </div>

          {selectedCourse === "Semua Mata Kuliah" ? (
            <p className="text-muted bg-white fst-italic">
              Pilih mata kuliah terlebih dahulu untuk mengirim tugas.
            </p>
          ) : (
            <>
              <div className="mb-3 bg-white">
                <label htmlFor="assignment" className="form-label bg-white">
                  Tugas
                </label>
                <input
                  type="text"
                  className="form-control bg-white"
                  id="assignment"
                  placeholder="Masukkan nama tugas"
                />
              </div>

              <div className="mb-3 bg-white">
                <label htmlFor="fileUpload" className="form-label bg-white">
                  Upload File
                </label>
                <input
                  type="file"
                  className="form-control bg-white"
                  id="fileUpload"
                />
              </div>

              <button
                type="submit"
                className="rounded-3 bg-color1 bg-hover1 py-2 px-4"
              >
                Submit
              </button>
            </>
          )}
        </form>
      </div>

      {/* STATUS Tugas */}
        <div className="p-4 border mt-3 bg-white rounded-4 d-flex flex-column align-items-center"
        style={{ width: "30%" }}>
          <h4 className="mb-4 bg-white">Status Tugas</h4>

          <table className="table bg-white">
            <thead>
              <tr>
                <th className="bg-white">Mata Kuliah</th>
                <th className="bg-white">Status</th>
                <th className="bg-white text-center">Nilai</th>
              </tr>
            </thead>

            <tbody>
              {filteredStatus.length > 0 ? (
                filteredStatus.map((item, index) => (
                  <tr key={index}>
                    <td className="bg-white">{item.matkul}</td>
                    <td className="bg-white">{item.status}</td>
                    <td className="bg-white fw-bold text-center">{item.nilai}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center bg-white">
                    Tidak ada data tugas untuk mata kuliah ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
};

export default PengumpulanTugas;
