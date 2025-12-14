const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper: tentukan prodi dari NIM berdasarkan angka terakhir
function getProdiFromNim(nim) {
  if (!nim || typeof nim !== 'string') return null;
  const trimmed = nim.trim();
  if (trimmed.length === 0) return null;
  const lastChar = trimmed.slice(-1);
  if (!/^\d$/.test(lastChar)) return null;
  const num = parseInt(lastChar, 10);
  const mod = num % 5;
  const idx = mod === 0 ? 5 : mod; // map 0 -> 5
  return String(idx).padStart(2, '0');
}

// -----------------------
// Matkul endpoints (existing)
// -----------------------
router.get('/matkul/:prodiId', async (req, res) => {
  try {
    const { prodiId } = req.params;
    const result = await pool.query(
      'SELECT id, kode, nama, sks FROM matkul WHERE TRIM(prodi_id) = $1',
      [prodiId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("MATKUL ERROR:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/matkul/by-nim/:nim', async (req, res) => {
  try {
    const { nim } = req.params;
    const prodiId = getProdiFromNim(nim);
    if (!prodiId) {
      return res.status(400).json({ error: 'NIM tidak valid untuk menentukan prodi' });
    }
    const result = await pool.query(
      'SELECT id, kode, nama, sks FROM matkul WHERE TRIM(prodi_id) = $1',
      [prodiId]
    );
    return res.json({ prodiId, matkul: result.rows });
  } catch (err) {
    console.error("MATKUL BY NIM ERROR:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// -----------------------
// KRS submit
// -----------------------
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

// -----------------------
// Get KRS mahasiswa
// -----------------------
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

// -----------------------
// Get Jadwal berdasarkan KRS yang sudah ACC
// -----------------------
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

// -----------------------
// Dosen pending KRS & decide (existing, dengan insert jadwal menggunakan 2025/2026)
// -----------------------
router.get('/dosen/:dosenId/krs/pending', async (req, res) => {
  const { dosenId } = req.params;
  const { semester, tahun_ajaran } = req.query;

  try {
    const dosenRes = await pool.query('SELECT id, nama, canacckrs FROM dosen WHERE id = $1', [dosenId]);
    if (dosenRes.rowCount === 0) {
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    const dosen = dosenRes.rows[0];

    let query, params;
    if (dosen.canacckrs) {
      query = `
        SELECT k.*, mat.nama as nama_matkul, mat.sks, mat.prodi_id,
              d.nama as nama_dosen, j.hari, j.waktu_mulai, j.ruang,
              mhs.nama AS nama_mahasiswa
        FROM krs k
        JOIN matkul mat ON k.kode_matkul = mat.kode
        LEFT JOIN jadwal j ON mat.kode = j.kode_matkul AND j.semester = k.semester AND j.tahun_ajaran = k.tahun_ajaran
        LEFT JOIN dosen d ON j.dosen_id = d.id
        LEFT JOIN mahasiswa mhs ON k.nim = mhs.nim
        WHERE k.status = 'pending'
      `;
      params = [];
    } else {
      query = `
        SELECT DISTINCT k.*, mat.nama as nama_matkul, mat.sks, mat.prodi_id,
              d.nama as nama_dosen, j.hari, j.waktu_mulai, j.ruang,
              mhs.nama AS nama_mahasiswa
        FROM krs k
        JOIN matkul mat ON k.kode_matkul = mat.kode
        LEFT JOIN jadwal j ON mat.kode = j.kode_matkul AND j.semester = k.semester AND j.tahun_ajaran = k.tahun_ajaran
        LEFT JOIN dosen d ON j.dosen_id = d.id
        LEFT JOIN mahasiswa mhs ON k.nim = mhs.nim
        WHERE k.status = 'pending'
          AND (
            (j.dosen_id = $1)
            OR (TRIM(mat.prodi_id) = (SELECT TRIM(prodi_id) FROM dosen WHERE id = $1))
          )
      `;
      params = [dosenId];
    }

    if (semester) {
      query += params.length ? " AND k.semester = $" + (params.length + 1) : " AND k.semester = $1";
      params.push(semester);
    }

    if (tahun_ajaran) {
      query += params.length ? " AND k.tahun_ajaran = $" + (params.length + 1) : " AND k.tahun_ajaran = $1";
      params.push(tahun_ajaran);
    }

    query += " ORDER BY k.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get Pending KRS Error:", err);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});



// Replace the existing router.post('/dosen/:dosenId/krs/decide', ...) handler in routes/krs.js with this.

router.post('/dosen/:dosenId/krs/decide', async (req, res) => {
  const { dosenId } = req.params;
  const { krs_ids, action } = req.body;

  if (!Array.isArray(krs_ids) || krs_ids.length === 0) {
    return res.status(400).json({ error: "krs_ids harus array berisi minimal 1 id" });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: "action harus 'approve' atau 'reject'" });
  }

  const SKIP_INSERT = process.env.SKIP_JADWAL_INSERT === '1';
  const client = await pool.connect();

  try {
    const dosenIdInt = Number(dosenId);
    if (!Number.isInteger(dosenIdInt)) {
      client.release();
      return res.status(400).json({ error: 'dosenId tidak valid' });
    }

    // 1) Update KRS status inside a transaction, then commit
    await client.query('BEGIN');

    const dosenRes = await client.query('SELECT id, nama, canacckrs FROM dosen WHERE id = $1', [dosenIdInt]);
    if (dosenRes.rowCount === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Dosen tidak ditemukan' });
    }
    const dosen = dosenRes.rows[0];

    const krsRes = await client.query(
      'SELECT id, nim, kode_matkul, semester, tahun_ajaran, status FROM krs WHERE id = ANY($1::int[]) FOR UPDATE',
      [krs_ids]
    );
    if (krsRes.rowCount === 0) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Tidak ada entri KRS yang ditemukan untuk id yang diberikan' });
    }

    const allowedIds = [];
    const notAllowed = [];
    const alreadyNotPending = [];

    for (const row of krsRes.rows) {
      if (row.status !== 'pending') {
        alreadyNotPending.push(row.id);
        continue;
      }
      if (dosen.canacckrs) {
        allowedIds.push(row.id);
      } else {
        const checkRes = await client.query(
          `SELECT 1 FROM jadwal WHERE kode_matkul = $1 AND semester = $2 AND tahun_ajaran = $3 AND dosen_id = $4 LIMIT 1`,
          [row.kode_matkul, row.semester, row.tahun_ajaran, dosenIdInt]
        );
        if (checkRes.rowCount > 0) allowedIds.push(row.id);
        else notAllowed.push(row.id);
      }
    }

    let updatedCount = 0;
    let updatedRows = [];

    if (allowedIds.length > 0) {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updRes = await client.query(
        `UPDATE krs SET status = $1 WHERE id = ANY($2::int[]) AND status = 'pending' RETURNING id, nim, kode_matkul, semester, tahun_ajaran`,
        [newStatus, allowedIds]
      );
      updatedCount = updRes.rowCount;
      updatedRows = updRes.rows;
    }

    await client.query('COMMIT');
    client.release();

    // 2) After commit, for each updated KRS: ensure jadwal exists and create enrollment (krs->jadwal)
    const insertErrors = [];
    const skippedInserts = [];

    if (action === 'approve' && !SKIP_INSERT && updatedRows.length > 0) {
      for (const row of updatedRows) {
        const { id: krsId, kode_matkul, semester, tahun_ajaran } = row;

        try {
          const kode = String(kode_matkul);
          const sem = Number(semester);
          const ta = String(tahun_ajaran);

          // 2.a) Try find exact jadwal for same tahun_ajaran
          let jadwalTpl = await pool.query(
            `SELECT id, dosen_id, hari, waktu_mulai::text AS waktu_mulai, waktu_selesai::text AS waktu_selesai, ruang, tahun_ajaran
             FROM jadwal
             WHERE kode_matkul = $1 AND semester = $2 AND tahun_ajaran = $3
             LIMIT 1`,
            [kode, sem, ta]
          );

          // 2.b) If none, get most recent jadwal template for this kode_matkul
          if (!jadwalTpl.rows[0]) {
            jadwalTpl = await pool.query(
              `SELECT id, dosen_id, hari, waktu_mulai::text AS waktu_mulai, waktu_selesai::text AS waktu_selesai, ruang, tahun_ajaran
               FROM jadwal
               WHERE kode_matkul = $1
               ORDER BY tahun_ajaran DESC NULLS LAST
               LIMIT 1`,
              [kode]
            );
          }

          let targetJadwalId = null;

          if (jadwalTpl.rows[0]) {
            // we have a template; ensure a jadwal exists for the target TA (insert if not)
            const tmpl = jadwalTpl.rows[0];
            const dosenToUse = tmpl.dosen_id ? Number(tmpl.dosen_id) : dosen.id;
            const hariVal = tmpl.hari || null;
            const wmVal = tmpl.waktu_mulai || null;
            const wsVal = tmpl.waktu_selesai || null;
            const ruangVal = tmpl.ruang || null;

            // Try insert target jadwal and RETURNING id (will return id if inserted)
            const ins = await pool.query(
              `INSERT INTO jadwal (kode_matkul, semester, tahun_ajaran, dosen_id, hari, waktu_mulai, waktu_selesai, ruang)
               SELECT $1::varchar, $2::smallint, $3::varchar, $4::integer, $5::varchar, $6::time, $7::time, $8::varchar
               WHERE NOT EXISTS (
                 SELECT 1 FROM jadwal x WHERE x.kode_matkul = $1::varchar AND x.semester = $2::smallint AND x.tahun_ajaran = $3::varchar
               )
               RETURNING id`,
              [kode, sem, ta, dosenToUse, hariVal, wmVal, wsVal, ruangVal]
            );

            if (ins.rows[0] && ins.rows[0].id) {
              targetJadwalId = ins.rows[0].id;
            } else {
              // already exists -> select id
              const sel = await pool.query(
                `SELECT id FROM jadwal WHERE kode_matkul = $1 AND semester = $2 AND tahun_ajaran = $3 LIMIT 1`,
                [kode, sem, ta]
              );
              if (sel.rows[0]) targetJadwalId = sel.rows[0].id;
            }
          } else {
            // 2.c) No template at all -> attempt minimal insert using approver as dosen
            try {
              const insMinimal = await pool.query(
                `INSERT INTO jadwal (kode_matkul, semester, tahun_ajaran, dosen_id, hari, waktu_mulai, waktu_selesai, ruang)
                 VALUES ($1::varchar, $2::smallint, $3::varchar, $4::integer, NULL, NULL, NULL, NULL)
                 RETURNING id`,
                [kode, sem, ta, dosen.id]
              );
              if (insMinimal.rows[0]) targetJadwalId = insMinimal.rows[0].id;
            } catch (errCreate) {
              // could fail due to NOT NULL constraints — collect and continue
              skippedInserts.push({ krsId, kode_matkul: kode, reason: 'failed to create minimal jadwal: ' + (errCreate.message || String(errCreate)) });
            }
          }

          // 3) If we have a target jadwal id, create enrollment (link krs -> jadwal)
          if (targetJadwalId) {
            try {
              await pool.query(
                `INSERT INTO enrollment (krs_id, jadwal_id)
                 VALUES ($1::int, $2::int)
                 ON CONFLICT DO NOTHING`,
                [krsId, targetJadwalId]
              );
            } catch (enrollErr) {
              // log and collect but do not rollback KRS approval
              console.error(`Enrollment insert failed for krsId=${krsId}, jadwalId=${targetJadwalId}:`, enrollErr);
              insertErrors.push({ krsId, kode_matkul: kode, error: enrollErr.message || String(enrollErr) });
            }
          } else {
            // no jadwal id found/created
            skippedInserts.push({ krsId, kode_matkul: kode, reason: 'no jadwal created/found' });
          }
        } catch (insErr) {
          console.error(`Insert/jadwal/enroll error for krsId=${krsId}, kode=${kode_matkul}, ta=${tahun_ajaran}:`, insErr);
          insertErrors.push({
            krsId,
            kode_matkul,
            semester,
            tahun_ajaran,
            error: {
              message: insErr.message || String(insErr),
              code: insErr.code || null,
              constraint: insErr.constraint || null,
              detail: insErr.detail || null
            }
          });
        }
      } // end for loop
    } // end if approve

    // 4) return response with details (approval succeeded; show any insert issues)
    return res.json({
      success: true,
      action,
      requested: krs_ids.length,
      updated: updatedCount,
      updated_ids: updatedRows.map(r => r.id),
      not_allowed_ids: notAllowed,
      already_not_pending: alreadyNotPending,
      skippedInserts,
      insertErrors
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    try { client.release(); } catch (_) {}
    console.error('Dosen KRS Decide Error (fatal):', err);
    return res.status(500).json({ error: "Gagal memproses keputusan KRS", details: err.message || String(err) });
  }
});
// -----------------------
// KRS eligibility/status/allowed-years
// -----------------------
router.get('/krs/eligibility/:nim', async (req, res) => {
  const { nim } = req.params;

  try {
    // Resolve student id from SIAKAD table (configuration-aware)
    const SIAKAD_TABLE = process.env.SIAKAD_TABLE || 'public.mahasiswa';
    const SIAKAD_ID_COL = process.env.SIAKAD_ID_COL || 'id';
    const SIAKAD_NIM_COL = process.env.SIAKAD_NIM_COL || 'nim';

    const stuRes = await pool.query(
      `SELECT ${SIAKAD_ID_COL} AS id FROM ${SIAKAD_TABLE} WHERE ${SIAKAD_NIM_COL} = $1 LIMIT 1`,
      [nim]
    );

    // If student not found in SIAKAD, assume no KHS exist => allow by default
    if (!stuRes.rows.length) {
      return res.json({ allowed: true });
    }
    const studentId = stuRes.rows[0].id;

    // Check for any approved KRS that doesn't yet have corresponding KHS rows
    const q = `
      SELECT k.semester, k.tahun_ajaran
      FROM krs k
      WHERE k.nim = $1
        AND LOWER(COALESCE(k.status,'')) = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM khs h
          WHERE h.student_id = $2
            AND COALESCE(h.semester::text,'') = COALESCE(k.semester::text,'')
            AND COALESCE(h.tahun_ajaran,'') = COALESCE(k.tahun_ajaran,'')
        )
      GROUP BY k.semester, k.tahun_ajaran
      ORDER BY k.tahun_ajaran, k.semester;
    `;
    const result = await pool.query(q, [nim, studentId]);

    if (result.rows.length > 0) {
      const pending = result.rows.map(r => ({ semester: r.semester, tahun_ajaran: r.tahun_ajaran }));
      const first = pending[0];
      const reason = `Menunggu hasil KHS semester ${first.semester} tahun ${first.tahun_ajaran}.`;
      return res.json({ allowed: false, reason, pending });
    }

    return res.json({ allowed: true });
  } catch (err) {
    console.error('eligibility check error:', err);
    // Fail-open: if eligibility check fails, allow and warn frontend
    return res.status(500).json({ allowed: true, warning: 'eligibility check failed on server' });
  }
});

router.get('/krs/status/:nim', async (req, res) => {
  const { nim } = req.params;
  const { semester, tahun_ajaran } = req.query;

  try {
    if (!semester || !tahun_ajaran) {
      const qAll = `
        SELECT semester, tahun_ajaran, status
        FROM krs
        WHERE nim = $1
        ORDER BY tahun_ajaran DESC, semester DESC
        LIMIT 1
      `;
      const rAll = await pool.query(qAll, [nim]);
      if (rAll.rows.length === 0) return res.json({ exists: false });
      const row = rAll.rows[0];
      return res.json({ exists: true, semester: row.semester, tahun_ajaran: row.tahun_ajaran, status: row.status });
    }

    const q = `
      SELECT status
      FROM krs
      WHERE nim = $1
        AND COALESCE(semester::text, '') = COALESCE($2::text, '')
        AND COALESCE(tahun_ajaran, '') = COALESCE($3, '')
      LIMIT 1
    `;
    const result = await pool.query(q, [nim, semester, tahun_ajaran]);

    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }

    const status = result.rows[0].status || null;
    return res.json({ exists: true, status });
  } catch (err) {
    console.error('krs status error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Force allowed years to 2025/2026 only (per request)
router.get('/krs/allowed-years/:nim', async (req, res) => {
  try {
    const forced = '2025/2026';
    return res.json({
      allowed: [forced],
      reason: `Tahun ajaran dibatasi ke ${forced} sesuai konfigurasi.`
    });
  } catch (err) {
    console.error('allowed-years error:', err);
    return res.status(500).json({ allowed: ['2025/2026'], warning: 'Server error, fallback to 2025/2026' });
  }
});

module.exports = router;