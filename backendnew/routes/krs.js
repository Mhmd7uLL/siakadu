const express = require('express');
const router = express.Router();
const pool = require('../db');

// Ambil semua matkul berdasarkan prodi mahasiswa
router.get('/matkul/:prodiId', async (req, res) => {
  try {
    const { prodiId } = req.params;

    const result = await pool.query(
      'SELECT id, kode, nama, sks FROM matkul WHERE prodi_id = $1',
      [prodiId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("MATKUL ERROR:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ========== TAMBAHKAN KODE INI DI BAWAH ==========

// Submit KRS
router.post("/krs/submit", async (req, res) => {
  const { nim, matkul_list, semester, tahun_ajaran } = req.body;

  if (!nim || !matkul_list || !Array.isArray(matkul_list) || matkul_list.length === 0) {
    return res.status(400).json({ error: "Data tidak lengkap" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      "DELETE FROM krs WHERE nim = $1 AND semester = $2 AND tahun_ajaran = $3",
      [nim, semester, tahun_ajaran]
    );

    for (const kode_matkul of matkul_list) {
      await client.query(
        "INSERT INTO krs (nim, kode_matkul, semester, tahun_ajaran, status) VALUES ($1, $2, $3, $4, $5)",
        [nim, kode_matkul, semester, tahun_ajaran, "pending"]
      );
    }

    await client.query("COMMIT");

    res.json({ 
      success: true, 
      message: "KRS berhasil disubmit",
      count: matkul_list.length 
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("KRS Submit Error:", err);
    res.status(500).json({ error: "Gagal submit KRS", details: err.message });
  } finally {
    client.release();
  }
});

// Get KRS mahasiswa
router.get("/krs/:nim", async (req, res) => {
  const { nim } = req.params;
  const { semester, tahun_ajaran } = req.query;

  try {
    let query = `
      SELECT k.*, m.nama, m.sks, m.prodi_id 
      FROM krs k
      JOIN matkul m ON k.kode_matkul = m.kode
      WHERE k.nim = $1
    `;
    const params = [nim];

    if (semester) {
      query += " AND k.semester = $2";
      params.push(semester);
    }

    if (tahun_ajaran) {
      query += semester ? " AND k.tahun_ajaran = $3" : " AND k.tahun_ajaran = $2";
      params.push(tahun_ajaran);
    }

    query += " ORDER BY k.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get KRS Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Get jadwal kuliah berdasarkan KRS mahasiswa
router.get("/jadwal/:nim", async (req, res) => {
  const { nim } = req.params;
  const { semester, tahun_ajaran } = req.query;

  try {
    const query = `
      SELECT 
        j.id,
        j.hari,
        j.waktu_mulai,
        j.waktu_selesai,
        j.ruang,
        m.kode,
        m.nama as nama_matkul,
        m.sks,
        d.nama as nama_dosen,
        k.status as status_krs
      FROM krs k
      JOIN matkul m ON k.kode_matkul = m.kode
      JOIN jadwal j ON m.kode = j.kode_matkul 
        AND j.semester = k.semester 
        AND j.tahun_ajaran = k.tahun_ajaran
      LEFT JOIN dosen d ON j.dosen_id = d.id
      WHERE k.nim = $1 
        AND k.semester = $2 
        AND k.tahun_ajaran = $3
        AND k.status = 'approved'
      ORDER BY 
        CASE j.hari
          WHEN 'Senin' THEN 1
          WHEN 'Selasa' THEN 2
          WHEN 'Rabu' THEN 3
          WHEN 'Kamis' THEN 4
          WHEN 'Jumat' THEN 5
          WHEN 'Sabtu' THEN 6
          ELSE 7
        END,
        j.waktu_mulai
    `;

    const result = await pool.query(query, [nim, semester, tahun_ajaran]);
    res.json(result.rows);
  } catch (err) {
    console.error("Get Jadwal Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

module.exports = router;