const express = require('express');
const router = express.Router();
const pool = require('../db'); // pastikan pool diexport dari ../db

router.get('/ruang/list', async (req, res) => {
  try {
    const dosen = req.query.dosen ? String(req.query.dosen).trim() : null;

    let q;
    let params = [];

    if (dosen && dosen.length > 0) {
      q = `
        SELECT DISTINCT TRIM(COALESCE(j.ruang,'')) AS ruang
        FROM jadwal j
        JOIN dosen d ON d.id = j.dosen_id
        WHERE TRIM(COALESCE(j.ruang,'')) <> ''
          AND LOWER(d.nama) LIKE $1
        ORDER BY ruang;
      `;
      params = [`%${dosen.toLowerCase()}%`];
    } else {
      q = `
        SELECT DISTINCT TRIM(COALESCE(ruang,'')) AS ruang
        FROM jadwal
        WHERE TRIM(COALESCE(ruang,'')) <> ''
        ORDER BY ruang;
      `;
    }

    const { rows } = await pool.query(q, params);

    // Avoid caching stale empty arrays
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    if (res.removeHeader) res.removeHeader('ETag');

    return res.json((rows || []).map(r => ({ ruang: r.ruang })));
  } catch (err) {
    console.error('ruang/list error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});


router.get('/attendance/students', async (req, res) => {
  const { ruang, semester, tahun_ajaran } = req.query;
  if (!ruang) return res.status(400).json({ error: 'Parameter ruang required' });

  try {
    const ruangNorm = String(ruang).trim().toLowerCase();

    const params = [ruangNorm];
    let whereExtra = '';
    if (semester && tahun_ajaran) {
      whereExtra = ' AND semester = $2 AND tahun_ajaran = $3';
      params.push(Number(semester), String(tahun_ajaran));
    } else if (semester && !tahun_ajaran) {
      whereExtra = ' AND semester = $2';
      params.push(Number(semester));
    } else if (!semester && tahun_ajaran) {
      whereExtra = ' AND tahun_ajaran = $2';
      params.push(String(tahun_ajaran));
    }

    const jadwalQuery = `
      SELECT id, kode_matkul, semester, tahun_ajaran
      FROM jadwal
      WHERE lower(trim(coalesce(ruang,''))) = $1
      ${whereExtra}
      ORDER BY tahun_ajaran DESC NULLS LAST, semester DESC
    `;
    const jadwalRows = (await pool.query(jadwalQuery, params)).rows;
    if (!jadwalRows || jadwalRows.length === 0) return res.json([]);

    const jadwalIds = jadwalRows.map(r => r.id);
    const kodeList = Array.from(new Set(jadwalRows.map(r => r.kode_matkul)));

    try {
      const qEnroll = `
        SELECT DISTINCT m.nim, m.nama, k.id as krs_id
        FROM enrollment e
        JOIN krs k ON e.krs_id = k.id
        JOIN mahasiswa m ON k.nim = m.nim
        WHERE e.jadwal_id = ANY($1::int[])
        ORDER BY m.nama;
      `;
      const rEnroll = await pool.query(qEnroll, [jadwalIds]);
      if (rEnroll.rows && rEnroll.rows.length > 0) return res.json(rEnroll.rows);
    } catch (e) {
      console.warn('Enrollment query failed (will fallback):', e.message || e);
    }

    const semResolved = semester ? Number(semester) : jadwalRows[0].semester;
    const taResolved = tahun_ajaran ? String(tahun_ajaran) : jadwalRows[0].tahun_ajaran;

    const qKrs = `
      SELECT DISTINCT m.nim, m.nama, k.id as krs_id
      FROM krs k
      JOIN mahasiswa m ON k.nim = m.nim
      WHERE k.kode_matkul = ANY($1::text[])
        AND k.semester = $2
        AND k.tahun_ajaran = $3
        AND LOWER(COALESCE(k.status,'')) = 'approved'
      ORDER BY m.nama;
    `;
    const rKrs = await pool.query(qKrs, [kodeList, semResolved, taResolved]);
    return res.json(rKrs.rows);
  } catch (err) {
    console.error('attendance students error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;