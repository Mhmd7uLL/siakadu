import React, { useState, useEffect } from "react";

const FormKRS = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ambil kode prodi dari NIM digit ke-3 dan ke-4
  const kodeProdi = user?.nim ? user.nim.slice(2, 4) : null;

  // Fetch mata kuliah sesuai prodi
  useEffect(() => {
    if (!kodeProdi) {
      setError("NIM tidak valid");
      setLoading(false);
      return;
    }

    const fetchMatkul = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/matkul/${kodeProdi}`);
        
        if (!res.ok) {
          throw new Error("Gagal mengambil data mata kuliah");
        }
        
        const data = await res.json();
        console.log("DATA MATKUL:", data);
        setCourses(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching matkul:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMatkul();
  }, [kodeProdi]);

  // Checkbox handler
  const handleCheck = (courseCode) => {
    setSelectedCourses((prev) =>
      prev.includes(courseCode)
        ? prev.filter((code) => code !== courseCode)
        : [...prev, courseCode]
    );
  };

  // Hitung total SKS
  const totalSKS = selectedCourses.reduce((total, code) => {
    const course = courses.find((c) => c.kode === code);
    return total + (course ? course.sks : 0);
  }, 0);

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedCourses.length === 0) {
      alert("Pilih minimal 1 mata kuliah");
      return;
    }

    console.log("KRS yang dipilih:", {
      nim: user.nim,
      courses: selectedCourses,
      totalSKS
    });
    
    alert(`KRS berhasil disubmit!\nTotal SKS: ${totalSKS}\nJumlah MK: ${selectedCourses.length}`);
  };

  return (
    <div className="p-4 border mt-3 bg-white rounded-4">
      <h4 className="mb-4 bg-white">KRS - {user?.nama}</h4>
      <p className="bg-white mb-3">
        <strong className="bg-white">Prodi:</strong> {kodeProdi === "01" ? "Teknik Informatika" : 
                    kodeProdi === "02" ? "Sistem Informasi" : 
                    kodeProdi === "03" ? "Teknik Elektro" :
                    kodeProdi === "04" ? "Manajemen" :
                    kodeProdi === "05" ? "Akuntansi" : "Unknown"}
      </p>

      {loading && <p className="bg-white">Loading mata kuliah...</p>}
      {error && <p className="bg-white text-danger">Error: {error}</p>}

      {!loading && !error && (
        <form className="bg-white" onSubmit={handleSubmit}>
          <div className="mb-3 bg-white">
            <label htmlFor="semester" className="form-label bg-white">
              Semester
            </label>
            <select className="form-select bg-white" id="semester">
              <option>Ganjil 2024/2025</option>
              <option>Genap 2024/2025</option>
            </select>
          </div>

          <div className="mb-3 bg-white">
            <div className="d-flex justify-content-between bg-white">
              <label className="form-label bg-white">Mata Kuliah</label>
              <label className="form-label bg-white">
                Jumlah SKS: <strong className="bg-white">{totalSKS}</strong>
              </label>
            </div>

            {courses.length === 0 ? (
              <p className="bg-white">Tidak ada mata kuliah tersedia untuk prodi ini.</p>
            ) : (
              <table className="table bg-white">
                <thead className="bg-white">
                  <tr>
                    <th className="bg-primary text-white">Kode</th>
                    <th className="bg-primary text-white">Nama Matkul</th>
                    <th className="bg-primary text-white">SKS</th>
                    <th className="bg-primary text-white">Pilih</th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {courses.map((c) => (
                    <tr key={c.kode}>
                      <td className="bg-white">{c.kode}</td>
                      <td className="bg-white">{c.nama}</td>
                      <td className="bg-white">{c.sks}</td>
                      <td className="bg-white">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(c.kode)}
                          onChange={() => handleCheck(c.kode)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button
            type="submit"
            className="bg-color1 bg-hover1 px-4 py-1 rounded-3"
            disabled={selectedCourses.length === 0}
          >
            Submit KRS ({selectedCourses.length} MK, {totalSKS} SKS)
          </button>
        </form>
      )}
    </div>
  );
};

export default FormKRS;