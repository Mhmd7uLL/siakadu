import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useEffect, useState } from 'react';
import Landing from "./Pages/Landing.jsx";
import RegistMHS from "./Pages/Register.jsx";
import LoginMHS from "./Pages/Login.jsx";
import DashboardMahasiswa from "./Pages/Mahasiswa/DashboardMahasiswa";
import DashboardDosen from "./Pages/Dosen/DashboardDosen";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style-Regis-Login.css";
import "./styles/responsive.css";

function App() {
  const [user, setUser] = useState(null);

  // pada mount, baca user dari localStorage (jika ada)
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch (e) {
        console.warn('Invalid user in localStorage, clearing');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    // simpan ke state dan persist ke localStorage
    setUser(userData);
    try {
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to persist user to localStorage', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // redirect ke login halaman jika perlu
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<RegistMHS />} />
        <Route path="/login" element={<LoginMHS onLogin={handleLogin} />} />
        <Route
          path="/dashboard"
          element={
            user ? (
              user.role === 'mahasiswa' ? (
                <DashboardMahasiswa user={user} onLogout={handleLogout} />
              ) : user.role === 'dosen' ? (
                <DashboardDosen user={user} onLogout={handleLogout} />
              ) : (
                <div>Role tidak dikenali</div>
              )
            ) : (
              <div>
                Silakan login terlebih dahulu. <a href="/login">Login</a>
              </div>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;