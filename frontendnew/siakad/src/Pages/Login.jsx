import { Link, useNavigate } from "react-router-dom";
import React, { useState } from "react";

function LoginMHS({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", { // pakai relatif agar Vite proxy bekerja
        method: "POST",
        credentials: "include", // penting agar cookie session tersimpan
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        // simpan user ke localStorage supaya komponen lain bisa baca
        try {
          localStorage.setItem("user", JSON.stringify(data));
          if (data && (data.id || data.student_id)) {
            const sid = data.id ?? data.student_id;
            localStorage.setItem("studentId", String(sid));
          }
          if (data && data.nim) localStorage.setItem("nim", String(data.nim));
          window.__USER__ = data; // global quick-access for other components
        } catch (e) {
          // ignore storage errors
        }

        if (typeof onLogin === "function") onLogin(data);
        navigate("/dashboard");
      } else {
        alert(data?.error || "Login gagal");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi error server");
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