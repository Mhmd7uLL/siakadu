import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useState } from 'react';
import Landing from "./Pages/Landing";
import RegistMHS from "./Pages/Register";
import LoginMHS from "./Pages/Login";
import DashboardMahasiswa from "./Pages/Mahasiswa/DashboardMahasiswa";
import DashboardDosen from "./Pages/Dosen/DashboardDosen";
import "./styles/style-Regis-Login.css";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [user, setUser] = useState(null);
  const handleLogin = (userData) => {
    setUser(userData);
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
                <DashboardMahasiswa user={user} />
              ) : user.role === 'dosen' ? (
                <DashboardDosen user={user} />
              ) : (
                <div>Role tidak dikenali</div>
              )
            ) : (
              <div>Silakan login terlebih dahulu. <a href="/login">Login</a></div>
            )
          }
          />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
