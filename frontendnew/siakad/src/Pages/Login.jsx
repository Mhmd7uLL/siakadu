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
  <div className="grad-color2 min-vh-100 d-flex align-items-center">
    <div className="d-flex flex-column flex-md-row mx-auto rounded-4 bg-transparent">

      {/* LEFT SIDE */}
      <div className="ms-md-4 mb-4 mb-md-0 bg-transparent text-white text-center text-md-start">
        <h6 className="bg-transparent">- UNIVERSITY Present -</h6>
        <h2 className="bg-transparent fw-bold">
          Let's become part of the big family !
        </h2>
      </div>

      {/* RIGHT SIDE */}
      <div className="login-box py-5 bg-white w-100 w-md-50 shadow-lg rounded-4 ms-md-4">
        <h5 className="text-center mb-4 text-black fw-bold bg-white">
          Login
        </h5>

        <form
          className="mx-auto text-black bg-white px-4"
          style={{ width: "90%" }}
          onSubmit={handleSubmit}
        >

          <div className="mb-3 bg-white">
            Email
            <input
              type="email"
              className="form-control rounded-5"
              placeholder="Masukkan Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-3 bg-white">
            Password
            <input
              type="password"
              className="form-control rounded-5"
              placeholder="Masukkan password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="rounded-5 w-100 mt-4 bg-color1 bg-hover1 py-2"
          >
            Login
          </button>

          <div className="text-center bg-white mt-4" style={{ fontSize: "14px" }}>
            Belum ada akun?{" "}
            <Link to="/register" className="bg-white">
              Register
            </Link>
          </div>

        </form>
      </div>
    </div>
  </div>
);

}

export default LoginMHS;
