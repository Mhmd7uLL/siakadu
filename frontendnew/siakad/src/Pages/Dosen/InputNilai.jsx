import React, { useState, useEffect, useMemo } from 'react';
import './styles/inputnilai.css'; 

const BOBOT = {
  kehadiran: 0.10, 
  tugas: 0.20,     
  uts: 0.30,       
  uas: 0.40        
};

const INITIAL_STUDENTS = [
  { id: 1, nim: '2021001', name: 'Budi Santoso', kehadiran: 85, tugas: 80, uts: 75, uas: 82, nilaiAkhir: 0, huruf: '' },
  { id: 2, nim: '2021002', name: 'Siti Aminah', kehadiran: 90, tugas: 85, uts: 88, uas: 90, nilaiAkhir: 0, huruf: '' },
  { id: 3, nim: '2021003', name: 'Andi Wijaya', kehadiran: 75, tugas: 70, uts: 65, uas: 70, nilaiAkhir: 0, huruf: '' },
  { id: 4, nim: '2021004', name: 'Dewi Lestari', kehadiran: 95, tugas: 90, uts: 85, uas: 88, nilaiAkhir: 0, huruf: '' },
  { id: 5, nim: '2021005', name: 'Rizki Pratama', kehadiran: 80, tugas: 75, uts: 78, uas: 80, nilaiAkhir: 0, huruf: '' },
  { id: 6, nim: '2021006', name: 'Maya Sari', kehadiran: 88, tugas: 82, uts: 80, uas: 85, nilaiAkhir: 0, huruf: '' },
];

const InputNilaiPage = () => {
  const [students, setStudents] = useState(INITIAL_STUDENTS);

  const getGradeLetter = (nilai) => {
    if (nilai >= 80) return 'A';
    if (nilai >= 70) return 'B';
    if (nilai >= 60) return 'C';
    if (nilai >= 50) return 'D';
    return 'E';
  };

  useEffect(() => {
    const updatedStudents = students.map(student => {
      const finalScore = Math.round(
        (student.kehadiran * BOBOT.kehadiran) +
        (student.tugas * BOBOT.tugas) +
        (student.uts * BOBOT.uts) +
        (student.uas * BOBOT.uas)
      );
      
      return {
        ...student,
        nilaiAkhir: finalScore,
        huruf: getGradeLetter(finalScore),
      };
    });
    setStudents(updatedStudents);
  }, []);

  const handleScoreChange = (id, field, value) => {
    const newStudents = students.map(student => {
      if (student.id === id) {
        const score = parseInt(value) || 0; 
        
        const newStudent = { ...student, [field]: score };

        const finalScore = Math.round(
          (newStudent.kehadiran * BOBOT.kehadiran) +
          (newStudent.tugas * BOBOT.tugas) +
          (newStudent.uts * BOBOT.uts) +
          (newStudent.uas * BOBOT.uas)
        );

        return {
          ...newStudent,
          nilaiAkhir: finalScore,
          huruf: getGradeLetter(finalScore),
        };
      }
      return student;
    });
    setStudents(newStudents);
  };

  const statistics = useMemo(() => {
    const totalScore = students.reduce((sum, s) => sum + s.nilaiAkhir, 0);
    const counts = students.reduce((acc, s) => {
      acc[s.huruf] = (acc[s.huruf] || 0) + 1;
      return acc;
    }, {});

    return {
      rataRata: students.length > 0 ? (totalScore / students.length).toFixed(1) : 0,
      nilaiA: counts['A'] || 0,
      nilaiB: counts['B'] || 0,
      nilaiC: counts['C'] || 0,
      nilaiDE: (counts['D'] || 0) + (counts['E'] || 0),
    };
  }, [students]);


  return (
    <div className="nilai-wrapper">
      <h2 className="nilai-header">Input Nilai Mahasiswa</h2>

      <div className="nilai-container">
        
        <div className="control-section-nilai">
          <h3 className="control-title-nilai">Daftar Nilai</h3>
          <div className="control-actions-nilai">
            <select className="control-dropdown-nilai">
              <option>TI-3A - Pemrograman Web</option>
            </select>
            <button className="control-button-nilai">Simpan Nilai</button>
          </div>
        </div>

        <div className="info-matkul-box">
          <div className="info-item">Mata Kuliah: **Pemrograman Web**</div>
          <div className="info-item">Semester: **Ganjil 2025/2026**</div>
          <div className="info-item">SKS: **3**</div>
          <div className="info-item">Jumlah Mahasiswa: **6**</div>
        </div>

        <div className="table-responsive-nilai">
          <table className="nilai-table">
            <thead>
              <tr>
                <th>No</th>
                <th>NIM</th>
                <th>Nama Mahasiswa</th>
                <th>Kehadiran (10%)</th>
                <th>Tugas (20%)</th>
                <th>UTS (30%)</th>
                <th>UAS (40%)</th>
                <th>Nilai Akhir</th>
                <th>Huruf</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.nim}</td>
                  <td>{student.name}</td>
                  
                  {['kehadiran', 'tugas', 'uts', 'uas'].map(field => (
                    <td key={field}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="score-input"
                        value={student[field]}
                        onChange={(e) => handleScoreChange(student.id, field, e.target.value)}
                      />
                    </td>
                  ))}

                  <td className="score-output">{student.nilaiAkhir}</td>
                  <td>
                    <span className={`grade-badge grade-${student.huruf}`}>
                        {student.huruf}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="statistic-section">
          <h4 className="statistic-title">Statistik Nilai</h4>
          <div className="statistic-grid">
            <div className="stat-item">
              <div className="stat-label">Rata-rata</div>
              <div className="stat-value rata-rata">{statistics.rataRata}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Nilai A</div>
              <div className="stat-value grade-A">{statistics.nilaiA}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Nilai B</div>
              <div className="stat-value grade-B">{statistics.nilaiB}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Nilai C</div>
              <div className="stat-value grade-C">{statistics.nilaiC}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Nilai D/E</div>
              <div className="stat-value grade-D-E">{statistics.nilaiDE}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="keterangan-section">
        <h4 className="keterangan-title">Keterangan Bobot Penilaian</h4>
        
        <div className="bobot-grid">
          <div className="bobot-item">Kehadiran **10%**</div>
          <div className="bobot-item">Tugas **20%**</div>
          <div className="bobot-item">UTS **30%**</div>
          <div className="bobot-item">UAS **40%**</div>
        </div>

        <div className="konversi-box">
          <span className="konversi-label">Konversi Nilai:</span>
          A (80-100) | B (70-79) | C (60-69) | D (50-59) | E (0-50)
        </div>
      </div>
    </div>
  );
};

export default InputNilaiPage;