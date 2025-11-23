import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";

const VALID_USERS = [
  { email: 'mahasiswa1@univ.com', password: '123', role: 'mahasiswa', nama: 'Budi Santoso', id: 1 },
  { email: 'dosen@univ.com', password: '789', role: 'dosen', nama: 'Dr. Siti Dewi', id: 10, canAccKRS: true },
];

function LoginMHS({ onLogin}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const userMatch = VALID_USERS.find(
      (user) => user.email === email && user.password === password
    )

    if (userMatch) {
      const userData = {
        id: userMatch.id,
        email: userMatch.email,
        role: userMatch.role,
        nama: userMatch.nama,
        ...(userMatch.role === 'dosen' && { canAccKRS: userMatch.canAccKRS }),
      };
      onLogin(userData);
      navigate("/dashboard");
    }else {
      alert("Invalid email or password");
    }
  };
  return (
    <div className="regis-MHS container my-5">
      <div className="box-regist d-flex flex-row mx-auto bg-white text-white rounded-5 border border-secondary-subtle">
        <div className="p-5 grad-color2 w-75 rounded-5 fs-1 fw-bold">
            <h5 className="bg-transparent fw-lighter fs-6">- UNIVERSITY Present -</h5>
            <h1 className="bg-transparent fw-bold">Let's become part of the big family !</h1>
        </div>

        <div className="mt-5 p-4 w-75 mx-5 bg-white">
          <h1 className="d-flex justify-content-center mb-5 bg-white text-black">
            Halaman Login
          </h1>
          <form className="mx-auto p-2 text-black rounded w-75 bg-white" onSubmit={handleSubmit}>
            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="Masukkan Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-3 bg-white">
              <label className="form-label bg-white">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Masukkan password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="rounded-3 w-100 mt-4 bg-color1 bg-hover1 py-2">
              Login
            </button>
            <div className="my-5 text-center fs-6 bg-white">
              Don't have an account? <Link to="/register" className="bg-white">Sign up here</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginMHS;
