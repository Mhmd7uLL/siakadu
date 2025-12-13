const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/matkul/:kodeProdi", async (req, res) => {
  const { kodeProdi } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM matkul WHERE prodi_id = $1",
      [kodeProdi]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("MATKUL ERROR:", err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;