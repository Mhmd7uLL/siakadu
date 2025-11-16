import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let dummyUsers = []; // hanya disimpan sementara di RAM

app.get("/", (req, res) => {
  res.send("✅ SIAKAD Backend aktif di port " + process.env.PORT);
});

app.post("/api/register", (req, res) => {
  const { nama, induk, email, password } = req.body;

  dummyUsers.push({ nama, induk, email, password });

  res.json({ message: "Registrasi berhasil", data: req.body });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = dummyUsers.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Login gagal" });
  }

  res.json({ message: "Login berhasil", user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server backend berjalan di http://localhost:${PORT}`);
  connectDB();
});
