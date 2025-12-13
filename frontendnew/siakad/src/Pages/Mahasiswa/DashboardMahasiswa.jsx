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
    fetch("http://localhost:5000/api/mahasiswa")
      .then((res) => res.json())
      .then((data) => setMahasiswa(data))
      .catch(err => console.error(err));
  }, []);

  if (!user || user.role !== "mahasiswa") return null;

  const totalMahasiswa = mahasiswa.length;
  const avgGPA = 0;

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
          {menu === "tambahKRS" && <FormKRS user={user} />} {}
          {menu === "cekJadwal" && <JadwalKuliah user={user} />}
          {menu === "pengumpulanTugas" && <PengumpulanTugas />}
          {menu === "khs" && <KHS />}
        </div>
      </div>
    </div>
  );
};

export default DashboardMahasiswa;