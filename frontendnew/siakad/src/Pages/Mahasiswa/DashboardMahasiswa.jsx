import React, { useEffect, useState } from "react";
import NavbarMahasiswa from "./NavbarMahasiswa";
import ProfilMahasiswa from "./ProfilMahasiswa";
import FormKRS from "./FormKRS";
import JadwalKuliah from "./JadwalKuliah";
import PengumpulanTugas from "./PengumpulanTugas";
import KHS from "./KHS";

const DashboardMahasiswa = ({ user }) => {
  const [menu, setMenu] = useState("profil");
  const [mahasiswa, setMahasiswa] = useState([]);

  useEffect(() => {
    fetch("/api/mahasiswa")
      .then((res) => res.json())
      .then((data) => setMahasiswa(data));
  }, []);

  if (!user || user.role !== "mahasiswa") return null;


  const totalMahasiswa = mahasiswa.length;
  const avgGPA = mahasiswa.length
    ? (mahasiswa.reduce((sum, m) => sum + m.gpa, 0) / mahasiswa.length).toFixed(2)
    : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <NavbarMahasiswa onMenuSelect={setMenu} />

      <div style={{ flex: 1 }}>
        <h4 className="bg-white p-4 border border-bottom-black">Dashboard Mahasiswa</h4>

        <div className="px-4">
          <p>Total Mahasiswa: {totalMahasiswa}</p>
          <p>Rata-rata GPA: {avgGPA}</p>
        </div>



        <div style={{ marginTop: "2rem" }} className="mx-4">
          {menu === "profil" && <ProfilMahasiswa user={user} />}
          {menu === "tambahKRS" && <FormKRS />}
          {menu === "cekJadwal" && <JadwalKuliah />}
          {menu === "pengumpulanTugas" && <PengumpulanTugas />}
          {menu === "khs" && <KHS />}
        </div>
      </div>
    </div>
  );
};

export default DashboardMahasiswa;
