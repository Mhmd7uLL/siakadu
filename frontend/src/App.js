import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Pages/Landing";
import RegistMHS from "./Pages/Register";
import LoginMHS from "./Pages/Login";
import "./styles/style-Regis-Login.css";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<RegistMHS />} />
        <Route path="/login" element={<LoginMHS />} />

        {/* optional: halaman default */}
        <Route path="/" element={<LoginMHS />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
