import React, { useState } from "react";

const FormKRS = () => {
  const courses = [
    { code: "CS101", name: "Pengantar Pemrograman", sks: 3 },
    { code: "CS102", name: "Struktur Data", sks: 4 },
    { code: "CS103", name: "Basis Data", sks: 3 },
  ];

  const [selectedCourses, setSelectedCourses] = useState([]);

  // Handle checkbox klik
  const handleCheck = (courseCode) => {
    setSelectedCourses((prev) => {
      if (prev.includes(courseCode)) {
        // Kalau ada maka uncheck
        return prev.filter((code) => code !== courseCode);
      } else {
        // Kalau belum maka tambah
        return [...prev, courseCode];
      }
    });
  };

  // Hitung total SKS
  const totalSKS = selectedCourses.reduce((total, code) => {
    const course = courses.find((c) => c.code === code);
    return total + (course ? course.sks : 0);
  }, 0);

  return (
    <div className="p-4 border mt-3 bg-white rounded-4">
      <h4 className="mb-4 bg-white">KRS</h4>
      <form className="bg-white">
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

            <label className="form-label d-block bg-white">
              Jumlah SKS yang dipilih: <strong>{totalSKS}</strong>
            </label>
          </div>

          <table className="table bg-white">
            <thead className="bg-white">
              <tr className="bg-white">
                <th className="bg-primary text-white">Kode</th>
                <th className="bg-primary text-white">Mata Kuliah</th>
                <th className="bg-primary text-white">SKS</th>
                <th className="bg-primary text-white">Pilih</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {courses.map((c) => (
                <tr key={c.code}>
                  <td className="bg-white">{c.code}</td>
                  <td className="bg-white">{c.name}</td>
                  <td className="bg-white">{c.sks}</td>
                  <td className="bg-white">
                    <input
                      type="checkbox"
                      checked={selectedCourses.includes(c.code)}
                      onChange={() => handleCheck(c.code)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="submit" className="bg-color1 bg-hover1 px-4 py-1 rounded-3">
          Submit KRS
        </button>
      </form>
    </div>
  );
};

export default FormKRS;
