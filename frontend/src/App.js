import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Pages/Landing";
import RegistMHS from "./Pages/Register";
import LoginMHS from "./Pages/Login";
import "./styles/style-Regis-Login.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Dashboard from "./Pages/Mahasiswa/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<RegistMHS />} />
        <Route path="/login" element={<LoginMHS />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* optional: halaman default */}
        <Route path="/" element={<LoginMHS />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
