import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5000/api";

const FormKRS = ({ user }) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prodiId, setProdiId] = useState(null);

  const [semester, setSemester] = useState("1"); // 1 = Ganjil, 2 = Genap
  const [tahunAjaran, setTahunAjaran] = useState('');
  const [allowedYears, setAllowedYears] = useState([]); // dari backend

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // eligibility / status
  const [canSubmit, setCanSubmit] = useState(true);
  const [eligibilityMsg, setEligibilityMsg] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // KRS status for the current semester
  const [krsStatusLoading, setKrsStatusLoading] = useState(false);
  const [krsStatus, setKrsStatus] = useState({ exists: false, status: null });

  const prodiNames = {
    "01": "Teknik Informatika",
    "02": "Sistem Informasi",
    "03": "Teknik Elektro",
    "04": "Manajemen",
    "05": "Akuntansi"
  };

  // utility: compute default current academic year
  const computeCurrentAcademic = () => {
    const now = new Date();
    const baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    return `${baseYear}/${baseYear + 1}`;
  };

  // Fetch allowed years from backend
  useEffect(() => {
    if (!user || !user.nim) return;

    const fetchAllowed = async () => {
      try {
        const res = await fetch(`${API_BASE}/krs/allowed-years/${encodeURIComponent(user.nim)}`);
        if (!res.ok) {
          // fallback to current academic year
          setAllowedYears([computeCurrentAcademic()]);
          setTahunAjaran(computeCurrentAcademic());
          return;
        }
        const body = await res.json();
        const years = Array.isArray(body.allowed) && body.allowed.length > 0 ? body.allowed : [computeCurrentAcademic()];
        setAllowedYears(years);
        // set default selected year: if current academic in allowed, pick it, else pick first allowed
        const cur = computeCurrentAcademic();
        setTahunAjaran(years.includes(cur) ? cur : years[0]);
        // if backend gave reason (blocked future), show it as eligibilityMsg
        if (body.reason) setEligibilityMsg(body.reason);
      } catch (err) {
        console.warn('Failed to fetch allowed years, fallback to current', err);
        const cur = computeCurrentAcademic();
        setAllowedYears([cur]);
        setTahunAjaran(cur);
      }
    };

    fetchAllowed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch mata kuliah berdasarkan NIM (server menentukan prodi)
  useEffect(() => {
    if (!user || !user.nim) {
      setError("User / NIM tidak tersedia");
      setLoading(false);
      return;
    }

    const fetchMatkulByNim = async () => {
      try {
        setLoading(true);
        setError(null);
        setProdiId(null);
        setCourses([]);

        const res = await fetch(`${API_BASE}/matkul/by-nim/${encodeURIComponent(user.nim)}`);
        if (!res.ok) {
          let body = {};
          try { body = await res.json(); } catch (e) {}
          throw new Error(body.error || body.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        setProdiId(data.prodiId || null);
        setCourses(Array.isArray(data.matkul) ? data.matkul : (Array.isArray(data) ? data : []));
        setError(null);
      } catch (err) {
        console.error("Error fetching matkul by nim:", err);
        setError(err.message || "Gagal mengambil mata kuliah");
      } finally {
        setLoading(false);
      }
    };

    fetchMatkulByNim();
  }, [user]);

  // Check eligibility (existing rule) - optional endpoint
  useEffect(() => {
    if (!user || !user.nim) return;
    checkEligibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkEligibility = async () => {
    if (!user || !user.nim) return;
    setCheckingEligibility(true);
    setEligibilityMsg(null);
    try {
      const res = await fetch(`${API_BASE}/krs/eligibility/${encodeURIComponent(user.nim)}`);
      if (!res.ok) {
        console.warn('eligibility endpoint not available or returned error, allowing submit by default');
        setCanSubmit(true);
        setEligibilityMsg(null);
        setCheckingEligibility(false);
        return;
      }
      const body = await res.json();
      if (body && body.allowed === false) {
        setCanSubmit(false);
        setEligibilityMsg(body.reason || 'Anda belum dapat mengajukan KRS karena menunggu hasil KHS.');
      } else {
        setCanSubmit(true);
        setEligibilityMsg(null);
      }
    } catch (err) {
      console.warn('eligibility check failed, allowing submit by default', err);
      setCanSubmit(true);
      setEligibilityMsg(null);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Check KRS status for the currently selected semester/tahunAjaran
  useEffect(() => {
    if (!user || !user.nim || !tahunAjaran) return;
    checkKRSStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, semester, tahunAjaran]);

  const checkKRSStatus = async () => {
    if (!user || !user.nim) return;
    setKrsStatusLoading(true);
    try {
      const url = `${API_BASE}/krs/status/${encodeURIComponent(user.nim)}?semester=${encodeURIComponent(semester)}&tahun_ajaran=${encodeURIComponent(tahunAjaran)}`;
      const res = await fetch(url);
      if (!res.ok) {
        setKrsStatus({ exists: false, status: null });
        setKrsStatusLoading(false);
        return;
      }
      const body = await res.json();
      setKrsStatus({ exists: !!body.exists, status: body.status || null });
    } catch (err) {
      console.warn('Failed checking KRS status, allowing by default', err);
      setKrsStatus({ exists: false, status: null });
    } finally {
      setKrsStatusLoading(false);
    }
  };

  // Checkbox handler
  const handleCheck = (courseCode) => {
    setSelectedCourses((prev) =>
      prev.includes(courseCode) ? prev.filter((code) => code !== courseCode) : [...prev, courseCode]
    );
  };

  // Hitung total SKS
  const totalSKS = selectedCourses.reduce((total, code) => {
    const course = courses.find((c) => c.kode === code);
    return total + (course ? Number(course.sks) : 0);
  }, 0);

  // Handle submit -> panggil POST /krs/submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || !user.nim) {
      alert("User / NIM tidak tersedia.");
      return;
    }

    // just-in-time checks
    await checkEligibility();
    await checkKRSStatus();

    // Block if krsStatus shows approved for this semester
    if (krsStatus.exists && String(krsStatus.status).toLowerCase() === 'approved') {
      alert('KRS SEMESTER INI TELAH DI ACC. Tidak dapat mengajukan ulang.');
      return;
    }

    // Ensure tahunAjaran is allowed
    if (!allowedYears.includes(tahunAjaran)) {
      alert('Tahun ajaran yang Anda pilih tidak diizinkan saat ini.');
      return;
    }

    if (!canSubmit) {
      alert(eligibilityMsg || 'Anda tidak dapat mengajukan KRS saat ini.');
      return;
    }

    if (selectedCourses.length === 0) {
      alert("Pilih minimal 1 mata kuliah");
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const body = {
        nim: user.nim,
        matkul_list: selectedCourses,
        semester: Number(semester),
        tahun_ajaran: tahunAjaran
      };

      const res = await fetch(`${API_BASE}/krs/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Gagal submit KRS");
      }

      setSubmitResult({ success: true, data });
      setSelectedCourses([]);
      alert(`KRS berhasil disubmit!\nTotal SKS: ${totalSKS}\nJumlah MK: ${selectedCourses.length}`);
      // refresh status and allowed years after submit
      checkKRSStatus();
      checkEligibility();
      // refetch allowed years to reflect new state
      const resAllowed = await fetch(`${API_BASE}/krs/allowed-years/${encodeURIComponent(user.nim)}`);
      if (resAllowed.ok) {
        const body = await resAllowed.json();
        const years = Array.isArray(body.allowed) && body.allowed.length > 0 ? body.allowed : [computeCurrentAcademic()];
        setAllowedYears(years);
        setTahunAjaran(years.includes(computeCurrentAcademic()) ? computeCurrentAcademic() : years[0]);
        if (body.reason) setEligibilityMsg(body.reason);
      }
    } catch (err) {
      console.error("Submit KRS error:", err);
      setSubmitResult({ success: false, error: err.message });
      alert(`Gagal submit KRS: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // UI: if KRS this semester is already approved, show message instead of list
  const isAccThisSemester = krsStatus.exists && String(krsStatus.status).toLowerCase() === 'approved';

  return (
    <div className="p-4 border mt-3 bg-white rounded-4">
      <h4 className="mb-4 bg-white">KRS - {user?.nama ?? "Mahasiswa"}</h4>

      <p className="bg-white mb-3">
        <strong className="bg-white">NIM:</strong> {user?.nim ?? "-"} <br />
        <strong className="bg-white">Prodi (ditentukan server):</strong>{" "}
        {prodiId ? (prodiNames[prodiId] || prodiId) : (loading ? "Menentukan..." : "Unknown")}
      </p>

      <div className="mb-3 bg-white">
        <label className="form-label bg-white">Semester</label>
        <select value={semester} onChange={(e) => setSemester(e.target.value)} className="form-select bg-white">
          <option value="1">Ganjil</option>
          <option value="2">Genap</option>
        </select>
      </div>

      <div className="mb-3 bg-white">
        <label className="form-label bg-white">Tahun Ajaran</label>
        {allowedYears.length === 0 ? (
          <input className="form-control" value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)} />
        ) : (
          <select className="form-select" value={tahunAjaran} onChange={(e) => setTahunAjaran(e.target.value)}>
            {allowedYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
      </div>

      {krsStatusLoading ? (
        <p>Memeriksa status KRS...</p>
      ) : isAccThisSemester ? (
        <div className="alert alert-success">
          <strong>KRS SEMESTER INI TELAH DI ACC</strong>
          <div style={{ marginTop: 6 }}>
            Jika Anda ingin mengubah, hubungi bagian akademik. (Semester: {semester}, Tahun: {tahunAjaran})
          </div>
        </div>
      ) : (
        <>
          {checkingEligibility && <p>Memeriksa kelayakan pengajuan...</p>}
          {eligibilityMsg && <div className="alert alert-warning">{eligibilityMsg}</div>}

          {loading && <p>Loading mata kuliah...</p>}
          {error && <p className="text-danger">Error: {error}</p>}

          {!loading && !error && (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <div className="d-flex justify-content-between">
                  <label className="form-label">Mata Kuliah</label>
                  <label className="form-label">
                    Jumlah SKS: <strong>{totalSKS}</strong>
                  </label>
                </div>

                {courses.length === 0 ? (
                  <p>Tidak ada mata kuliah tersedia untuk prodi ini.</p>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Kode</th>
                        <th>Nama Matkul</th>
                        <th>SKS</th>
                        <th>Pilih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c) => (
                        <tr key={c.kode}>
                          <td>{c.kode}</td>
                          <td>{c.nama}</td>
                          <td>{c.sks}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedCourses.includes(c.kode)}
                              onChange={() => handleCheck(c.kode)}
                              disabled={!canSubmit || submitting}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={selectedCourses.length === 0 || submitting || !canSubmit}>
                {submitting ? "Submitting..." : `Submit KRS (${selectedCourses.length} MK, ${totalSKS} SKS)`}
              </button>

              {submitResult && (
                <div className="mt-3">
                  {submitResult.success ? <div className="text-success">Submit berhasil.</div> : <div className="text-danger">Error: {submitResult.error}</div>}
                </div>
              )}
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default FormKRS;