import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function RegistMHS() {

  const [formData, setFormData] = useState({
    nama: "",
    induk: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    console.log(data);

    alert("Registrasi berhasil!");

    navigate("/login");
  };


  return (
    <div className="regis-MHS container my-5">
      <div className="box-regist d-flex flex-row bg-white mx-auto text-white rounded-5 border border-primary">
        <div className="mt-5 p-4 w-75 mx-5 bg-white">
          <h1 className="d-flex justify-content-center mb-5 text-black bg-white fw-bold">
            Halaman Registrasi
          </h1>
          <form onSubmit={handleSubmit} className="mx-auto p-2 text-black rounded w-75 bg-white">
            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Nama Lengkap</label>
              <input
                type="text"
                className="form-control"
                name="nama"
                onChange={handleChange}
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Nomor Induk</label>
              <input
                type="text"
                className="form-control"
                name="induk"
                onChange={handleChange}
                placeholder="Masukkan Nomor Induk"
                required
              />
            </div>

            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                onChange={handleChange}
                placeholder="Masukkan email"
                required
              />
            </div>

            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Password</label>
              <input
                type="password"
                className="form-control"
                name="password"
                onChange={handleChange}
                placeholder="Masukkan password"
                required
              />
            </div>

            <button type="submit" className="rounded-3 w-100 mt-4 bg-color1 bg-hover1 py-2">
              Register
            </button>
            <div className="my-5 text-center fs-6 bg-white">
              Already have an account or you're a lecturer? <br></br><Link to="/login" className="bg-white">Login here</Link>
            </div>
          </form>
        </div>

        <div className="ms-4 p-5 grad-color1 w-75 rounded-5 fs-1 fw-bold">
          <h5 className="bg-color1 fw-lighter fs-6">- UNIVERSITY Present -</h5>
          Let's become part of the big family !
        </div>
      </div>
    </div>
  );
}

export default RegistMHS;