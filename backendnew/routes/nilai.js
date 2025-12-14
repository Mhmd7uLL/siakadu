// nilai.js
// Routes for nilai/student scores + debug middleware merged in (development only)
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
require('dotenv').config();

const upload = multer({ dest: path.join(__dirname, '..', 'tmp') });

const SIAKAD_TABLE = process.env.SIAKAD_TABLE || 'public.mahasiswa';
const SIAKAD_ID_COL = process.env.SIAKAD_ID_COL || 'id';
const SIAKAD_NIM_COL = process.env.SIAKAD_NIM_COL || 'nim';
const SIAKAD_NAME_COL = process.env.SIAKAD_NAME_COL || 'nama';
const SIAKAD_READONLY = (process.env.SIAKAD_READONLY === 'true');

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

const BOBOT = { kehadiran: 0.10, tugas: 0.20, uts: 0.30, uas: 0.40 };
function computeFinalScore({ kehadiran = 0, tugas = 0, uts = 0, uas = 0 }) {
  const score = Math.round(
    (Number(kehadiran) || 0) * BOBOT.kehadiran +
    (Number(tugas) || 0) * BOBOT.tugas +
    (Number(uts) || 0) * BOBOT.uts +
    (Number(uas) || 0) * BOBOT.uas
  );
  const huruf = score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'E';
  return { score, huruf };
}
function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }




router.use((req, res, next) => {
  try {
    console.log('--- WHOAMI DEBUG ---');
    console.log('time:', new Date().toISOString());
    console.log('method:', req.method, 'url:', req.originalUrl);
    console.log('session.exists:', !!req.session);
    if (req.session && typeof req.session === 'object') {
      console.log('session.user (safe):', {
        id: req.session.user?.id ?? null,
        role: req.session.user?.role ?? null
      });
    }
    console.log('req.user:', req.user || null);
    console.log('headers.x-user-role:', req.headers['x-user-role'] || req.headers['x_user_role'] || null);
    console.log('headers.x-dosen-id:', req.headers['x-dosen-id'] || req.headers['x_dosen_id'] || null);
    console.log('cookie header present:', !!req.headers.cookie);
    // req.cookies is available only if cookie-parser is used in main app; log keys if present
    try {
      console.log('cookies keys:', req.cookies ? Object.keys(req.cookies) : '(no req.cookies)');
    } catch (_) {
      console.log('cookies keys: (error reading req.cookies)');
    }
    console.log('remote ip:', req.ip || req.connection?.remoteAddress || null);
    console.log('--- /WHOAMI DEBUG ---');
  } catch (e) {
    console.warn('whoami debug middleware error', e);
  }
  next();
});

router.get('/whoami-debug', (req, res) => {
  try {
    const safeSession = req.session && typeof req.session === 'object'
      ? { user: { id: req.session.user?.id ?? null, role: req.session.user?.role ?? null } }
      : null;

    const cookies = req.cookies ? req.cookies : null;

    return res.json({
      server_time: new Date().toISOString(),
      session: safeSession,
      user: req.user || null,
      headers: {
        'x-user-role': req.headers['x-user-role'] || req.headers['x_user_role'] || null,
        'x-dosen-id': req.headers['x-dosen-id'] || req.headers['x_dosen_id'] || null,
        'cookie': req.headers['cookie'] || null
      },
      cookies: cookies
    });
  } catch (e) {
    return res.status(500).json({ error: 'whoami-debug error', details: String(e) });
  }
});


async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS khs (
      id SERIAL PRIMARY KEY,
      student_id INTEGER,
      kode_matkul TEXT,
      nama_matkul TEXT,
      sks INTEGER NOT NULL DEFAULT 0,
      huruf CHAR(1),
      tahun_ajaran VARCHAR(16),
      semester SMALLINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);

  // ensure updated_at exists on khs (used by some update logic)
  await pool.query(`
    ALTER TABLE khs
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  `);

  // student_scores
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_scores (
      id SERIAL PRIMARY KEY,
      student_id INTEGER,
      kehadiran INTEGER DEFAULT 0,
      tugas INTEGER DEFAULT 0,
      uts INTEGER DEFAULT 0,
      uas INTEGER DEFAULT 0,
      nilai_akhir INTEGER,
      huruf CHAR(1),
      kode_matkul VARCHAR(64),
      tahun_ajaran VARCHAR(16),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_student_scores_student_kode_year
      ON student_scores (student_id, kode_matkul, tahun_ajaran);
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_khs_student_year ON khs (student_id, tahun_ajaran);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_scores_student_year ON student_scores (student_id, tahun_ajaran);`);

  // ml_model: ensure modern schema with metadata columns (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ml_model (
      id SERIAL PRIMARY KEY,
      w DOUBLE PRECISION NOT NULL,
      b DOUBLE PRECISION NOT NULL,
      params JSONB,
      metrics JSONB,
      scaler JSONB,
      trained_rows INTEGER,
      trained_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
}

ensureTables().catch(err => console.warn('ensureTables warning:', err && err.message ? err.message : err));

/* --- helper: detect matkul columns (cache) --- */
let _matkulColsCache = null;
async function getMatkulCols() {
  if (_matkulColsCache) return _matkulColsCache;
  const q = `
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'matkul';
  `;
  const r = await pool.query(q);
  const cols = r.rows.map(rr => rr.column_name);
  _matkulColsCache = cols;
  return cols;
}
function pickMatkulKodeCol(cols) {
  if (cols.includes('kode_matkul')) return 'kode_matkul';
  if (cols.includes('kode')) return 'kode';
  if (cols.includes('kd')) return 'kd';
  return null;
}
function pickMatkulNamaCol(cols) {
  if (cols.includes('nama_matkul')) return 'nama_matkul';
  if (cols.includes('nama')) return 'nama';
  if (cols.includes('name')) return 'name';
  return null;
}

/* role helper */
function requireRole(allowed = []) {
  return (req, res, next) => {
    try {
      const roleFromSession = req.session && req.session.user && req.session.user.role;
      const roleFromUser = req.user && req.user.role;
      const roleFromHeader = (req.headers['x-user-role'] || req.headers['x_user_role'] || req.headers['x-role'] || '').toString().toLowerCase();
      const dosenIdHeader = req.headers['x-dosen-id'] || req.headers['x_dosen_id'];

      let role = roleFromSession || roleFromUser || roleFromHeader || null;
      if (role) role = role.toString().toLowerCase();

      // DEV fallback: if x-dosen-id present but no role, treat as 'dosen' (remove in production)
      if (!role && dosenIdHeader) role = 'dosen';

      if (!role) return res.status(401).json({ error: 'unauthenticated', message: 'Role not found in session or headers' });

      if (Array.isArray(allowed) && allowed.length > 0 && !allowed.map(r => r.toString().toLowerCase()).includes(role)) {
        return res.status(403).json({ error: 'forbidden', message: 'Insufficient role' });
      }

      req.user = req.user || {};
      req.user.role = role;
      next();
    } catch (err) {
      console.error('requireRole error', err);
      return res.status(500).json({ error: 'server_error' });
    }
  };
}

/* --- routes (nilai, khs, ml, etc) --- */
router.get('/matkul', async (req, res) => {
  try {
    const dosenId = req.query.dosenId || req.headers['x-dosen-id'] || req.headers['x_dosen_id'] || (req.session && req.session.user && req.session.user.dosen_id);

    const cols = await getMatkulCols();
    const kodeCol = pickMatkulKodeCol(cols) || "''";
    const namaCol = pickMatkulNamaCol(cols) || "''";
    const sksExpr = cols.includes('sks') ? 'COALESCE(m.sks,0)' : '0';

    const tableQ = `SELECT to_regclass('public.matkul_dosen') IS NOT NULL AS exists;`;
    const tableR = await pool.query(tableQ);
    const matkulDosenExists = tableR.rows[0] && tableR.rows[0].exists;

    let sql = `SELECT m.id, ${kodeCol === "''" ? "''" : `m.${kodeCol}`} AS kode_matkul, ${namaCol === "''" ? "''" : `m.${namaCol}`} AS nama_matkul, ${sksExpr} AS sks FROM matkul m`;
    const params = [];

    if (dosenId && matkulDosenExists) {
      sql += ` JOIN matkul_dosen md ON md.matkul_id = m.id WHERE md.dosen_id = $1`;
      params.push(dosenId);
    }

    sql += ` ORDER BY ${kodeCol === "''" ? "''" : `m.${kodeCol}`} NULLS LAST, ${namaCol === "''" ? "''" : `m.${namaCol}`} NULLS LAST`;

    const r = await pool.query(sql, params);
    const out = r.rows.map(row => ({
      id: row.id,
      kode_matkul: row.kode_matkul || '',
      nama_matkul: row.nama_matkul || '',
      sks: Number(row.sks || 0)
    }));
    return res.json(out);
  } catch (err) {
    console.warn('GET /matkul dynamic error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'db error', details: err.message });
  }
});

/**
 * GET /api/dosen/:dosenId/matkul-nilai
 */
router.get('/dosen/:dosenId/matkul-nilai', async (req, res) => {
  try {
    const dosenId = Number(req.params.dosenId);
    if (!Number.isInteger(dosenId)) return res.status(400).json({ error: 'dosenId invalid' });

    const semester = req.query.semester ? Number(req.query.semester) : null;
    const tahun_ajaran = req.query.tahun_ajaran || null;

    const q = `
      SELECT
        m.id, m.kode, m.nama, m.sks, j.semester, j.tahun_ajaran,
        COUNT(DISTINCT k.nim) FILTER (
          WHERE COALESCE(k.status,'') = 'approved'
            AND COALESCE(k.tahun_ajaran,'') = COALESCE($3::text, j.tahun_ajaran)
            AND ($2::smallint IS NULL OR k.semester = $2::smallint)
        ) AS jumlah_mahasiswa_terdaftar
      FROM jadwal j
      JOIN matkul m ON j.kode_matkul = m.kode
      LEFT JOIN krs k ON k.kode_matkul = m.kode
        AND COALESCE(k.tahun_ajaran,'') = COALESCE($3::text, j.tahun_ajaran)
        AND ($2::smallint IS NULL OR k.semester = $2::smallint)
      WHERE j.dosen_id = $1
        AND ($3::text IS NULL OR j.tahun_ajaran = $3::text)
        AND ($2::smallint IS NULL OR j.semester = $2::smallint)
      GROUP BY m.id, m.kode, m.nama, m.sks, j.semester, j.tahun_ajaran
      ORDER BY m.kode;
    `;
    const params = [dosenId, semester, tahun_ajaran];
    const r = await pool.query(q, params);

    if (r.rows.length === 0) {
      const fb = await pool.query(
        `SELECT m.id, m.kode, m.nama, m.sks, NULL::smallint AS semester, NULL::text AS tahun_ajaran, 0 AS jumlah_mahasiswa_terdaftar
         FROM matkul_dosen md JOIN matkul m ON md.matkul_id = m.id
         WHERE md.dosen_id = $1
         ORDER BY m.kode`, [dosenId]);
      return res.json({ source: 'matkul_dosen', rows: fb.rows });
    }

    return res.json({ source: 'jadwal', rows: r.rows });
  } catch (err) {
    console.error('Get matkul-nilai error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

/**
 * GET /api/dosen/:dosenId/matkul/:kode/mahasiswa
 */
router.get('/dosen/:dosenId/matkul/:kode/mahasiswa', async (req, res) => {
  try {
    const dosenId = Number(req.params.dosenId);
    if (!Number.isInteger(dosenId)) return res.status(400).json({ error: 'dosenId invalid' });

    const kode = req.params.kode;
    const semester = req.query.semester ? Number(req.query.semester) : null;
    const tahun_ajaran = req.query.tahun_ajaran || null;

    const verifyQ = `
      SELECT 1 FROM jadwal
      WHERE kode_matkul = $1
        AND ($2::smallint IS NULL OR semester = $2::smallint)
        AND ($3::text IS NULL OR tahun_ajaran = $3::text)
        AND dosen_id = $4
      LIMIT 1
    `;
    try {
      const verify = await pool.query(verifyQ, [kode, semester, tahun_ajaran, dosenId]);
      if (verify.rowCount === 0) {
        console.warn(`Warning: dosen ${dosenId} not found in jadwal for ${kode} ${semester}/${tahun_ajaran}`);
      }
    } catch (vErr) {
      console.error('verify jadwal query failed:', vErr && vErr.stack ? vErr.stack : vErr);
    }

    const q = `
      SELECT 
        km.nim,
        km.student_id,
        km.nama,
        ss.id AS score_id,
        ss.kehadiran,
        ss.tugas,
        ss.uts,
        ss.uas,
        ss.nilai_akhir,
        ss.huruf,
        ss.tahun_ajaran AS score_tahun_ajaran
      FROM (
        SELECT k.nim, mhs.${SIAKAD_ID_COL} AS student_id, mhs.${SIAKAD_NAME_COL} AS nama
        FROM krs k
        JOIN ${SIAKAD_TABLE} mhs ON k.nim = mhs.${SIAKAD_NIM_COL}
        WHERE k.kode_matkul = $1
          AND COALESCE(k.status,'') = 'approved'
          AND ($2::smallint IS NULL OR k.semester = $2::smallint)
          AND ($3::text IS NULL OR k.tahun_ajaran = $3::text)
      ) km
      LEFT JOIN student_scores ss
        ON ss.student_id = km.student_id
        AND COALESCE(ss.kode_matkul,'') = COALESCE($1,'')
        AND COALESCE(ss.tahun_ajaran,'') = COALESCE($3::text,'')
      ORDER BY km.nama;
    `;
    const params = [kode, semester, tahun_ajaran];
    const r = await pool.query(q, params);

    const rows = r.rows.map(row => ({
      student_id: row.student_id,
      nim: row.nim,
      nama: row.nama,
      existing_score: row.score_id ? {
        id: row.score_id,
        kehadiran: row.kehadiran,
        tugas: row.tugas,
        uts: row.uts,
        uas: row.uas,
        nilai_akhir: row.nilai_akhir,
        huruf: row.huruf,
        tahun_ajaran: row.score_tahun_ajaran
      } : null
    }));

    return res.json({ rows });
  } catch (err) {
    console.error('Get peserta matkul error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

router.post('/students/:id/scores', async (req, res) => {
  const sid = Number(req.params.id);
  if (!sid || Number.isNaN(sid)) return res.status(400).json({ error: 'invalid student id' });

  const {
    kehadiran = 0, tugas = 0, uts = 0, uas = 0,
    kode_matkul = null, tahun_ajaran = null, nama_matkul = null, sks = 0
  } = req.body || {};

  if (!kode_matkul || !tahun_ajaran) return res.status(400).json({ error: 'kode_matkul and tahun_ajaran required' });

  const parsed = {
    kehadiran: clampScore(kehadiran),
    tugas: clampScore(tugas),
    uts: clampScore(uts),
    uas: clampScore(uas)
  };
  const { score: nilaiAkhir, huruf } = computeFinalScore(parsed);

  // Upsert student_scores in a transaction
  const client = await pool.connect();
  let saved;
  try {
    await client.query('BEGIN');
    const upq = `
      INSERT INTO student_scores (student_id, kehadiran, tugas, uts, uas, nilai_akhir, huruf, kode_matkul, tahun_ajaran)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (student_id, kode_matkul, tahun_ajaran) DO UPDATE SET
        kehadiran = EXCLUDED.kehadiran,
        tugas = EXCLUDED.tugas,
        uts = EXCLUDED.uts,
        uas = EXCLUDED.uas,
        nilai_akhir = EXCLUDED.nilai_akhir,
        huruf = EXCLUDED.huruf,
        updated_at = now()
      RETURNING id, student_id, kehadiran, tugas, uts, uas, nilai_akhir, huruf, kode_matkul, tahun_ajaran, updated_at;
    `;
    const params = [sid, parsed.kehadiran, parsed.tugas, parsed.uts, parsed.uas, nilaiAkhir, huruf, String(kode_matkul), String(tahun_ajaran)];
    const upres = await client.query(upq, params);
    saved = upres.rows[0];
    await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    client.release();
    console.error('student_scores upsert failed:', err);
    return res.status(500).json({ error: 'db error', details: err.message || String(err) });
  } finally {
    try { client.release(); } catch (_) {}
  }

  // After saved, try to sync KHS (non-fatal)
  let khsInserted = false;
  let khsUpdated = false;
  try {
    await pool.query(`
      INSERT INTO public.students (id, nim, name, lolos_diluar, created_at)
      SELECT m.id, m.nim, COALESCE(m.nama,'')::text, FALSE, now()
      FROM public.mahasiswa m WHERE m.id = $1
      ON CONFLICT (id) DO UPDATE SET nim = EXCLUDED.nim, name = EXCLUDED.name
    `, [sid]);

    // try update existing khs row
    const up = await pool.query(`
      UPDATE khs SET huruf = $1, updated_at = now()
      WHERE student_id = $2 AND TRIM(LOWER(COALESCE(kode_matkul,''))) = TRIM(LOWER($3)) AND tahun_ajaran = $4
      RETURNING id
    `, [huruf, sid, String(kode_matkul), String(tahun_ajaran)]);
    if (up.rowCount) {
      khsUpdated = true;
    } else {
      try {
        let sksToInsert = Number(sks) || 0;
        if (!sksToInsert || sksToInsert <= 0) {
          try {
            const mat = await pool.query('SELECT COALESCE(sks,0) AS sks FROM matkul WHERE kode = $1 LIMIT 1', [String(kode_matkul)]);
            if (mat.rows && mat.rows[0]) {
              sksToInsert = Number(mat.rows[0].sks || 0);
            }
          } catch (matErr) {
            console.warn('matkul lookup failed for sks fallback:', matErr && matErr.message ? matErr.message : matErr);
          }
        }

        await pool.query(`
          INSERT INTO khs (student_id, kode_matkul, nama_matkul, sks, huruf, tahun_ajaran, created_at)
          VALUES ($1,$2,$3,$4,$5,$6, now())
        `, [sid, String(kode_matkul), nama_matkul || null, Number(sksToInsert) || 0, huruf, String(tahun_ajaran)]);
        khsInserted = true;
      } catch (insErr) {
        if (insErr && insErr.code === '23503') {
          console.warn('Skipping khs insert due to FK constraint:', insErr.message);
        } else {
          console.error('KHS insert error', insErr);
        }
      }
    }
  } catch (err) {
    console.warn('Non-fatal KHS sync error:', err && err.message ? err.message : err);
  }

  // optionally compute new IPK to return immediately (helpful for frontend)
  let newIpk = null;
  try {
    const ipkQ = `
      SELECT
        CASE WHEN SUM(sks) IS NULL OR SUM(sks)=0 THEN NULL
        ELSE (SUM(
          (CASE WHEN upper(huruf)='A' THEN 4
                WHEN upper(huruf)='B' THEN 3
                WHEN upper(huruf)='C' THEN 2
                WHEN upper(huruf)='D' THEN 1
                ELSE 0 END) * sks
        )::numeric) / SUM(sks) END AS ipk
      FROM khs
      WHERE student_id = $1 AND huruf IS NOT NULL;
    `;
    const ipkR = await pool.query(ipkQ, [sid]);
    newIpk = ipkR.rows[0] && ipkR.rows[0].ipk !== null ? Number(ipkR.rows[0].ipk) : null;
  } catch (e) {
    // ignore
  }

  return res.json({ saved, khsInserted, khsUpdated, ipk: newIpk });
});

/* KHS CRUD */
router.put('/khs/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { sks, huruf } = req.body;
    const r = await pool.query('UPDATE khs SET sks = COALESCE($1,sks), huruf = COALESCE($2,huruf) WHERE id = $3 RETURNING id,student_id,kode_matkul,nama_matkul,sks,huruf', [sks === undefined ? null : Number(sks), huruf === undefined ? null : String(huruf).toUpperCase(), id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: 'db error', details: e.message }); }
});
router.delete('/khs/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('DELETE FROM khs WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'db error', details: e.message }); }
});
/**
 * GET /api/students/:id/khs
 */
router.get('/students/:id/khs', async (req, res) => {
  const sid = Number(req.params.id);
  if (!sid || Number.isNaN(sid)) return res.status(400).json({ error: 'invalid student id' });

  try {
    const q = `
      SELECT id, student_id, kode_matkul, nama_matkul, sks, huruf, created_at, updated_at, semester, tahun_ajaran
      FROM khs
      WHERE student_id = $1
      ORDER BY tahun_ajaran NULLS LAST, kode_matkul;
    `;
    const { rows } = await pool.query(q, [sid]);
    return res.json(rows);
  } catch (err) {
    console.error('GET /students/:id/khs error', err);
    return res.status(500).json({ error: 'server error', details: err.message || String(err) });
  }
});

/**
 * GET /api/students/:id/ipk
 * Robust IPK endpoint with fallback to student_scores if needed.
 */
router.get('/students/:id/ipk', async (req, res) => {
  const sid = Number(req.params.id);
  if (!sid || Number.isNaN(sid)) return res.status(400).json({ error: 'invalid student id' });

  try {
    // compute from khs
    const qKhs = `
      SELECT
        SUM(sks) AS total_sks,
        SUM(
          (CASE WHEN upper(huruf)='A' THEN 4
                WHEN upper(huruf)='B' THEN 3
                WHEN upper(huruf)='C' THEN 2
                WHEN upper(huruf)='D' THEN 1
                ELSE 0 END) * sks
        )::numeric AS total_points
      FROM khs
      WHERE student_id = $1 AND huruf IS NOT NULL;
    `;
    const rKhs = await pool.query(qKhs, [sid]);
    const total_sks_khs = Number(rKhs.rows[0].total_sks || 0);
    const total_points_khs = Number(rKhs.rows[0].total_points || 0);

    if (total_sks_khs > 0) {
      const ipk = total_points_khs / total_sks_khs;
      return res.json({ ipk: Number(ipk.toFixed(3)), total_sks: total_sks_khs, total_points: Number(total_points_khs.toFixed(3)), source: 'khs' });
    }

    // fallback to student_scores joined with matkul.sks
    const qScores = `
      SELECT SUM(COALESCE(m.sks,0)) AS total_sks,
             SUM((CASE WHEN upper(ss.huruf)='A' THEN 4 WHEN upper(ss.huruf)='B' THEN 3 WHEN upper(ss.huruf)='C' THEN 2 WHEN upper(ss.huruf)='D' THEN 1 ELSE 0 END) * COALESCE(m.sks,0))::numeric AS total_points
      FROM student_scores ss
      LEFT JOIN matkul m ON ss.kode_matkul = m.kode
      WHERE ss.student_id = $1 AND ss.huruf IS NOT NULL;
    `;
    const rScores = await pool.query(qScores, [sid]);
    const total_sks_scores = Number(rScores.rows[0].total_sks || 0);
    const total_points_scores = Number(rScores.rows[0].total_points || 0);

    if (total_sks_scores > 0) {
      const ipk = total_points_scores / total_sks_scores;
      return res.json({ ipk: Number(ipk.toFixed(3)), total_sks: total_sks_scores, total_points: Number(total_points_scores.toFixed(3)), source: 'student_scores' });
    }

    return res.json({ ipk: null, total_sks: 0, total_points: 0, source: 'none' });
  } catch (err) {
    console.error('GET /students/:id/ipk error', err);
    return res.status(500).json({ error: 'server error', details: err.message || String(err) });
  }
});

/**
 * GET /api/students/:id/scores-all
 */
router.get('/students/:id/scores-all', async (req, res) => {
  const sid = Number(req.params.id);
  if (!sid || Number.isNaN(sid)) {
    return res.status(400).json({ error: 'invalid student id' });
  }

  try {
    const q = `
      SELECT 
        ss.id,
        ss.student_id,
        ss.kode_matkul,
        ss.tahun_ajaran,
        ss.huruf,
        ss.nilai_akhir,
        ss.kehadiran,
        ss.tugas,
        ss.uts,
        ss.uas,
        ss.updated_at,
        m.nama AS nama_matkul,
        m.sks,
        j.semester
      FROM student_scores ss
      LEFT JOIN matkul m ON ss.kode_matkul = m.kode
      LEFT JOIN jadwal j ON j.kode_matkul = ss.kode_matkul 
        AND j.tahun_ajaran = ss.tahun_ajaran
      WHERE ss.student_id = $1
      ORDER BY ss.tahun_ajaran DESC NULLS LAST, ss.kode_matkul;
    `;
    
    const { rows } = await pool.query(q, [sid]);
    
    const formatted = rows.map(row => ({
      id: row.id,
      student_id: row.student_id,
      kode_matkul: row.kode_matkul,
      nama_matkul: row.nama_matkul || row.kode_matkul,
      sks: row.sks || 0,
      huruf: row.huruf,
      nilai_akhir: row.nilai_akhir,
      tahun_ajaran: row.tahun_ajaran,
      semester: row.semester,
      kehadiran: row.kehadiran,
      tugas: row.tugas,
      uts: row.uts,
      uas: row.uas,
      updated_at: row.updated_at
    }));
    
    return res.json(formatted);
  } catch (err) {
    console.error('GET /students/:id/scores-all error', err);
    return res.status(500).json({ 
      error: 'server error', 
      details: err.message || String(err) 
    });
  }
});

/**
 * Debug endpoint - cek semua data nilai mahasiswa
 */
router.get('/students/:id/debug-scores', async (req, res) => {
  const sid = Number(req.params.id);
  if (!sid || Number.isNaN(sid)) {
    return res.status(400).json({ error: 'invalid student id' });
  }

  try {
    const mahasiswaCheck = await pool.query(
      `SELECT ${SIAKAD_ID_COL} AS id, ${SIAKAD_NIM_COL} AS nim, ${SIAKAD_NAME_COL} AS name 
       FROM ${SIAKAD_TABLE} 
       WHERE ${SIAKAD_ID_COL} = $1`,
      [sid]
    );

    const studentsCheck = await pool.query(
      'SELECT id, nim, name, lolos_diluar FROM students WHERE id = $1',
      [sid]
    );

    const scoresCheck = await pool.query(
      `SELECT 
        id, student_id, kode_matkul, tahun_ajaran, 
        kehadiran, tugas, uts, uas, nilai_akhir, huruf, 
        updated_at
       FROM student_scores 
       WHERE student_id = $1 
       ORDER BY tahun_ajaran DESC, kode_matkul`,
      [sid]
    );

    const khsCheck = await pool.query(
      `SELECT 
        id, student_id, kode_matkul, nama_matkul, 
        sks, huruf, tahun_ajaran, semester, created_at
       FROM khs 
       WHERE student_id = $1 
       ORDER BY tahun_ajaran DESC NULLS LAST, kode_matkul`,
      [sid]
    );

    const ipkCheck = await pool.query(
      `SELECT
        CASE WHEN SUM(sks) IS NULL OR SUM(sks)=0 THEN NULL
        ELSE (SUM(
          (CASE WHEN upper(huruf)='A' THEN 4
                WHEN upper(huruf)='B' THEN 3
                WHEN upper(huruf)='C' THEN 2
                WHEN upper(huruf)='D' THEN 1
                ELSE 0 END) * sks
        )::numeric) / SUM(sks) END AS ipk
      FROM khs
      WHERE student_id = $1 AND huruf IS NOT NULL`,
      [sid]
    );

    return res.json({
      student_id: sid,
      checks: {
        mahasiswa_table: {
          exists: mahasiswaCheck.rows.length > 0,
          data: mahasiswaCheck.rows[0] || null
        },
        students_table: {
          exists: studentsCheck.rows.length > 0,
          data: studentsCheck.rows[0] || null
        },
        student_scores: {
          count: scoresCheck.rows.length,
          data: scoresCheck.rows
        },
        khs: {
          count: khsCheck.rows.length,
          data: khsCheck.rows
        },
        ipk: {
          value: ipkCheck.rows[0]?.ipk || null
        }
      },
      diagnosis: {
        nilai_tersimpan: scoresCheck.rows.length > 0,
        khs_tersinkron: khsCheck.rows.length > 0,
        masalah: scoresCheck.rows.length > 0 && khsCheck.rows.length === 0 
          ? 'Nilai tersimpan di student_scores tapi belum masuk ke KHS'
          : scoresCheck.rows.length === 0 
          ? 'Belum ada nilai yang tersimpan'
          : 'Normal - nilai sudah tersinkron ke KHS'
      }
    });
  } catch (err) {
    console.error('Debug endpoint error:', err);
    return res.status(500).json({ 
      error: 'server error', 
      details: err.message || String(err) 
    });
  }
});
/* ---------------- ML implementation (enhanced) ---------------- */

const DEFAULT_DATASET_PATH = process.env.DATASET_CSV_PATH || path.join(__dirname, '..', 'dataset', 'data_data_ml_Version2.csv');

function computeRocAuc(labels, scores) {
  // Robust threshold-based trapezoid AUC implementation
  if (!Array.isArray(labels) || !Array.isArray(scores) || labels.length === 0) return 0.5;
  const paired = labels.map((l, i) => ({ label: Number(l) === 1 ? 1 : 0, score: Number(scores[i]) || 0 }));
  const P = paired.filter(p => p.label === 1).length;
  const N = paired.filter(p => p.label === 0).length;
  if (P === 0 || N === 0) return 0.5;

  const thresholds = Array.from(new Set(paired.map(p => p.score))).sort((a, b) => b - a);

  const points = [];
  points.push({ fpr: 0, tpr: 0 });
  for (const th of thresholds) {
    let tp = 0, fp = 0;
    for (const p of paired) {
      const pred = p.score >= th ? 1 : 0;
      if (pred === 1 && p.label === 1) tp++;
      if (pred === 1 && p.label === 0) fp++;
    }
    const tpr = P === 0 ? 0 : tp / P;
    const fpr = N === 0 ? 0 : fp / N;
    points.push({ fpr, tpr });
  }
  points.push({ fpr: 1, tpr: 1 });
  points.sort((a, b) => a.fpr - b.fpr);

  let auc = 0;
  for (let i = 1; i < points.length; i++) {
    const x1 = points[i - 1].fpr, x2 = points[i].fpr;
    const y1 = points[i - 1].tpr, y2 = points[i].tpr;
    auc += (x2 - x1) * (y1 + y2) / 2;
  }
  return Math.min(Math.max(auc, 0), 1);
}

function computeMetrics(yTrue, yProb, threshold = 0.5) {
  const yPred = yProb.map(p => (p >= threshold ? 1 : 0));
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const a = Number(yTrue[i]) === 1 ? 1 : 0;
    const b = yPred[i];
    if (a === 1 && b === 1) tp++;
    if (a === 0 && b === 0) tn++;
    if (a === 0 && b === 1) fp++;
    if (a === 1 && b === 0) fn++;
  }
  const n = yTrue.length;
  const accuracy = (tp + tn) / Math.max(1, n);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const f1 = (2 * precision * recall) / Math.max(1e-9, (precision + recall));
  const rocAuc = computeRocAuc(yTrue, yProb);
  return { accuracy, precision, recall, f1, rocAuc, tp, tn, fp, fn };
}

function findBestThreshold(labels, probs) {
  const uniq = Array.from(new Set(probs)).sort((a, b) => a - b);
  let best = { threshold: 0.5, f1: -1, precision: 0, recall: 0 };
  for (const th of uniq) {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < labels.length; i++) {
      const p = probs[i] >= th ? 1 : 0;
      if (p === 1 && Number(labels[i]) === 1) tp++;
      if (p === 1 && Number(labels[i]) === 0) fp++;
      if (p === 0 && Number(labels[i]) === 1) fn++;
    }
    const prec = tp / Math.max(1, tp + fp);
    const rec = tp / Math.max(1, tp + fn);
    const f1 = (2 * prec * rec) / Math.max(1e-9, (prec + rec));
    if (f1 > best.f1) best = { threshold: th, f1, precision: prec, recall: rec };
  }
  if (best.f1 < 0) best.threshold = 0.5;
  return best;
}

function standardizeArray(arr) {
  const xs = arr.slice();
  const n = xs.length;
  if (n === 0) return { xs: [], mean: 0, std: 1 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const std = Math.sqrt(variance) || 1;
  const out = xs.map(x => (x - mean) / std);
  return { xs: out, mean, std };
}

function trainLogisticSingleFeature(data, opts = {}) {
  const {
    lr = 0.5,
    epochs = 2000,
    reg = 0.01,
    valSplit = 0.2,
    earlyStoppingRounds = 50,
    verbose = false
  } = opts;

  const idx = Array.from({ length: data.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const n = data.length;
  const valN = Math.max(1, Math.floor(n * valSplit));
  const trainN = n - valN;

  const train = idx.slice(0, trainN).map(i => data[i]);
  const val = idx.slice(trainN).map(i => data[i]);

  const XtrainRaw = train.map(p => Number(p.x));
  const XvalRaw = val.map(p => Number(p.x));
  const Ytrain = train.map(p => Number(p.y) ? 1 : 0);
  const Yval = val.map(p => Number(p.y) ? 1 : 0);

  const { xs: Xtrain, mean, std } = standardizeArray(XtrainRaw);
  const Xval = XvalRaw.map(v => (v - mean) / std);

  let w = 0, b = 0;
  let best = null;
  let noImpro = 0;

  function lossAndGrad(Xarr, Yarr) {
    let loss = 0, dw = 0, db = 0;
    for (let i = 0; i < Xarr.length; i++) {
      const z = b + w * Xarr[i];
      const p = sigmoid(z);
      loss += - (Yarr[i] * Math.log(Math.max(1e-12, p)) + (1 - Yarr[i]) * Math.log(Math.max(1e-12, 1 - p)));
      const err = p - Yarr[i];
      dw += err * Xarr[i];
      db += err;
    }
    loss = loss / Math.max(1, Xarr.length);
    const lossReg = loss + 0.5 * reg * w * w;
    dw = dw / Math.max(1, Xarr.length) + reg * w;
    db = db / Math.max(1, Xarr.length);
    return { loss: lossReg, dw, db };
  }

  for (let ep = 0; ep < epochs; ep++) {
    const { loss: trainLoss, dw, db } = lossAndGrad(Xtrain, Ytrain);
    w -= lr * dw;
    b -= lr * db;

    const { loss: valLoss } = lossAndGrad(Xval, Yval);

    if (best === null || valLoss < best.valLoss - 1e-9) {
      best = { w, b, valLoss, epoch: ep };
      noImpro = 0;
    } else {
      noImpro++;
      if (noImpro >= earlyStoppingRounds) break;
    }
  }

  const allRaw = XtrainRaw.concat(XvalRaw);
  const allY = Ytrain.concat(Yval);
  const allStd = allRaw.map(v => (v - mean) / std);
  const allProbs = allStd.map(x => sigmoid(best.b + best.w * x));
  const metrics = computeMetrics(allY, allProbs);
  const bestThr = findBestThreshold(allY, allProbs);
  metrics.bestThreshold = bestThr;

  return {
    w: best.w,
    b: best.b,
    mean,
    std,
    trained_rows: n,
    metrics,
    params: { lr, epochs, reg, valSplit, earlyStoppingRounds }
  };
}

function loadDatasetFromCsv(csvPath) {
  if (!fs.existsSync(csvPath)) throw new Error('dataset file not found: ' + csvPath);
  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  if (!records || records.length === 0) throw new Error('dataset empty or parse failed');
  const header = Object.keys(records[0]).map(h => h.toString().toLowerCase().trim());
  const labelCandidates = ['lolos', 'target', 'label', 'y', 'lulus', 'passed'];
  const ipkCandidates = ['ipk', 'gpa', 'score_ipk'];

  let labelCol = null, ipkCol = null;
  for (const c of labelCandidates) {
    const idx = header.indexOf(c);
    if (idx !== -1) { labelCol = Object.keys(records[0])[idx]; break; }
  }
  for (const c of ipkCandidates) {
    const idx = header.indexOf(c);
    if (idx !== -1) { ipkCol = Object.keys(records[0])[idx]; break; }
  }

  if (!ipkCol) {
    for (const h of Object.keys(records[0])) {
      if (/id|nama|name|nim/i.test(h)) continue;
      if (!isNaN(Number(records[0][h]))) { ipkCol = h; break; }
    }
  }
  if (!labelCol) {
    for (const h of Object.keys(records[0])) {
      if (/lolos|lulus|passed|target|label|y/i.test(h)) { labelCol = h; break; }
    }
  }

  if (!ipkCol || !labelCol) {
    throw new Error(`Could not detect ipk column (${ipkCol}) or label column (${labelCol}) in CSV. Headers: ${Object.keys(records[0]).join(',')}`);
  }

  const data = [];
  for (const r of records) {
    const rawX = r[ipkCol];
    const rawY = r[labelCol];
    const x = rawX === '' || rawX === null || rawX === undefined ? null : Number(String(rawX).replace(',', '.'));
    if (rawY === null || rawY === undefined || rawY === '') continue;
    const ystr = String(rawY).trim().toLowerCase();
    let y;
    if (['1','true','yes','y','lulus','passed'].includes(ystr)) y = 1;
    else if (['0','false','no','n','tidak','gagal','failed'].includes(ystr)) y = 0;
    else {
      const yn = Number(ystr);
      if (!isNaN(yn)) y = yn ? 1 : 0; else continue;
    }
    if (x === null || isNaN(x)) continue;
    data.push({ x, y });
  }

  return { data, ipkCol, labelCol, rows: records.length };
}

/**
 * POST /api/nilai/ml/train-from-csv
 */
router.post('/ml/train-from-csv', async (req, res) => {
  try {
    const datasetPath = req.body?.datasetPath || process.env.DATASET_CSV_PATH || DEFAULT_DATASET_PATH;
    const opts = {
      lr: Number(req.body?.lr) || 0.5,
      epochs: Number(req.body?.epochs) || 2000,
      reg: Number(req.body?.reg) || 0.01,
      valSplit: Number(req.body?.valSplit) || 0.2,
      earlyStoppingRounds: Number(req.body?.earlyStoppingRounds) || 50
    };

    const { data, ipkCol, labelCol, rows } = loadDatasetFromCsv(datasetPath);
    if (!data || data.length < 6) return res.status(400).json({ error: 'not enough usable labeled rows', totalRows: rows, usable: data.length });

    const model = trainLogisticSingleFeature(data, opts);

    const insertQ = `
      INSERT INTO ml_model (w, b, params, metrics, scaler, trained_rows, trained_at)
      VALUES ($1,$2,$3,$4,$5,$6, now())
      RETURNING id, w, b, params, metrics, scaler, trained_rows, trained_at
    `;
    const paramsJson = JSON.stringify(model.params || {});
    const metricsJson = JSON.stringify(model.metrics || {});
    const scalerJson = JSON.stringify({ mean: model.mean, std: model.std });
    const ins = await pool.query(insertQ, [model.w, model.b, paramsJson, metricsJson, scalerJson, model.trained_rows]);
    return res.json({ ok: true, model: ins.rows[0], trained_on: data.length, ipkCol, labelCol });
  } catch (e) {
    console.error('ml train-from-csv error', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'server error', details: e.message || String(e) });
  }
});

/**
 * POST /api/nilai/ml/train
 * Train from DB students table (improved)
 */
router.post('/ml/train', async (req, res) => {
  try {
    const { lr = 0.5, epochs = 2000, reg = 0.01, valSplit = 0.2, earlyStoppingRounds = 50 } = req.body || {};

    const q = `
      SELECT s.id,
        (
          SELECT SUM(
            (CASE WHEN upper(k.huruf)='A' THEN 4 WHEN upper(k.huruf)='B' THEN 3 WHEN upper(k.huruf)='C' THEN 2 WHEN upper(k.huruf)='D' THEN 1 ELSE 0 END) * k.sks
          )::float / NULLIF(SUM(k.sks),0)
          FROM khs k WHERE k.student_id = s.id AND k.huruf IS NOT NULL
        ) AS ipk,
        s.lolos_diluar::boolean AS label
      FROM students s
      WHERE s.lolos_diluar IS NOT NULL
    `;
    const r = await pool.query(q);
    const rows = r.rows.filter(rw => rw.ipk !== null && rw.ipk !== undefined && (rw.label === true || rw.label === false || rw.label === 1 || rw.label === 0));
    const data = rows.map(rw => ({ x: Number(rw.ipk), y: rw.label ? 1 : 0 }));
    if (data.length < 6) return res.status(400).json({ error: 'Not enough labeled data (need >=6)', count: data.length });

    const model = trainLogisticSingleFeature(data, { lr: Number(lr), epochs: Number(epochs), reg: Number(reg), valSplit: Number(valSplit), earlyStoppingRounds: Number(earlyStoppingRounds) });

    const insertQ = `
      INSERT INTO ml_model (w,b,params,metrics,scaler,trained_rows,trained_at)
      VALUES ($1,$2,$3,$4,$5,$6, now())
      RETURNING id,w,b,params,metrics,scaler,trained_rows,trained_at
    `;
    const ins = await pool.query(insertQ, [model.w, model.b, JSON.stringify(model.params), JSON.stringify(model.metrics), JSON.stringify({ mean: model.mean, std: model.std }), model.trained_rows]);
    return res.json({ ok: true, model: ins.rows[0], trained_on: data.length });
  } catch (e) {
    console.error('ml/train error', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'server error', details: e.message || String(e) });
  }
});

/**
 * GET /api/nilai/ml/model
 */
router.get('/ml/model', async (req, res) => {
  try {
    const r = await pool.query('SELECT id,w,b,params,metrics,scaler,trained_rows,trained_at FROM ml_model ORDER BY trained_at DESC LIMIT 1');
    if (!r.rows.length) return res.json({ model: null });
    return res.json({ model: r.rows[0] });
  } catch (e) {
    console.error('ml/model error', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'db error', details: e.message || String(e) });
  }
});

/**
 * GET /api/nilai/ml/predict?ipk=...
 */
router.get('/ml/predict', async (req, res) => {
  try {
    const ipkRaw = req.query.ipk ?? req.body?.ipk;
    if (ipkRaw === undefined || ipkRaw === null) return res.status(400).json({ error: 'ipk required' });
    const ipkVal = Number(ipkRaw);
    if (isNaN(ipkVal)) return res.status(400).json({ error: 'ipk must be numeric' });

    const r = await pool.query('SELECT id,w,b,scaler FROM ml_model ORDER BY trained_at DESC LIMIT 1');
    if (!r.rows.length) {
      return res.status(404).json({ error: 'no trained model available' });
    }
    const m = r.rows[0];
    let scaled = ipkVal;
    try {
      const scaler = m.scaler ? (typeof m.scaler === 'object' ? m.scaler : JSON.parse(m.scaler)) : null;
      if (scaler && typeof scaler.mean === 'number' && typeof scaler.std === 'number') {
        scaled = (ipkVal - scaler.mean) / (scaler.std || 1);
      }
    } catch (e) { /* ignore scaler parse errors */ }

    const prob = sigmoid(m.b + m.w * scaled);
    return res.json({ ipk: ipkVal, probability: prob, usedModelId: m.id });
  } catch (e) {
    console.error('ml/predict error', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'server error', details: e.message || String(e) });
  }
});

module.exports = router;