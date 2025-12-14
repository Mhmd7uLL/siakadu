const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const DEBUG = process.env.DEBUG === '1';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file?.originalname || '');
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } }); // 20 MB

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tugas (
      id SERIAL PRIMARY KEY,
      judul VARCHAR NOT NULL,
      dosen_id INTEGER,
      prodi VARCHAR,
      tahun_angkatan VARCHAR,
      kode_matkul VARCHAR,
      deskripsi TEXT,
      deadline DATE,
      file_path VARCHAR,
      file_name VARCHAR,
      status VARCHAR DEFAULT 'Aktif',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      tugas_id INTEGER REFERENCES tugas(id) ON DELETE CASCADE,
      nim VARCHAR NOT NULL,
      nama VARCHAR,
      komentar TEXT,
      file_path VARCHAR,
      file_name VARCHAR,
      submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      grade VARCHAR,
      feedback TEXT
    );
  `);
  // tolerant upgrades for older schemas
  await pool.query(`ALTER TABLE tugas ADD COLUMN IF NOT EXISTS dosen_id INTEGER;`);
  await pool.query(`ALTER TABLE tugas ADD COLUMN IF NOT EXISTS prodi VARCHAR;`);
  await pool.query(`ALTER TABLE tugas ADD COLUMN IF NOT EXISTS tahun_angkatan VARCHAR;`);
  await pool.query(`ALTER TABLE tugas ADD COLUMN IF NOT EXISTS kode_matkul VARCHAR;`);
}

function parseCookieHeaderForName(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map(s => s.trim());
  for (const p of parts) {
    if (!p) continue;
    const [k, ...v] = p.split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function getDosenIdFromReq(req) {
  try {
    if (req.session && req.session.user && req.session.user.id) {
      const n = Number(req.session.user.id);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) {}

  try {
    if (req.session && req.session.user && req.session.user.email) {
      const email = String(req.session.user.email);
      const r = await pool.query('SELECT id FROM dosen WHERE email = $1 LIMIT 1', [email]);
      if (r.rows.length) {
        const n = Number(r.rows[0].id);
        if (!Number.isNaN(n) && n > 0) return n;
      }
    }
  } catch (e) { if (DEBUG) console.warn('getDosenIdFromReq email lookup failed', e.message); }

  try {
    if (req.user && (req.user.id || req.user.dosen_id)) {
      const n = Number(req.user.id || req.user.dosen_id);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) {}

  try {
    const header = req.headers['x-dosen-id'] || req.headers['x_dosen_id'];
    if (header) {
      const n = Number(header);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) {}

  try {
    if (req.cookies && req.cookies.dosenId) {
      const n = Number(req.cookies.dosenId);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    const fromHeader = parseCookieHeaderForName(req.headers && req.headers.cookie, 'dosenId');
    if (fromHeader) {
      const n = Number(fromHeader);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) { if (DEBUG) console.warn('cookie parse error', e.message); }

  try {
    if (req.body && req.body.dosen_id) {
      const n = Number(req.body.dosen_id);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) {}

  try {
    if (req.query && req.query.dosen_id) {
      const n = Number(req.query.dosen_id);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  } catch (e) {}

  return null;
}


function buildFileUrl(req, storedFilePath) {
  if (!storedFilePath) return null;
  // storedFilePath may be 'uploads/12345-....ext' or just filename; normalize to filename
  const filename = path.basename(storedFilePath);
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/uploads/${encodeURIComponent(filename)}`;
}


function attachFileUrlToRows(req, rows) {
  return rows.map(r => {
    const filePath = r.file_path || r.filepath || null;
    return {
      ...r,
      file_url: filePath ? buildFileUrl(req, filePath) : null
    };
  });
}



/**
 * GET /api/tugas
 */
router.get('/tugas', async (req, res) => {
  try {
    await ensureTables();
    let { prodi, tahun_angkatan, kode_matkul, dosen_id } = req.query;

    if (!dosen_id && req.session && req.session.user) {
      const sid = req.session.user.id;
      if (sid) dosen_id = String(sid);
      else if (req.session.user.email) {
        try {
          const r = await pool.query('SELECT id FROM dosen WHERE email = $1 LIMIT 1', [String(req.session.user.email)]);
          if (r.rows.length) dosen_id = String(r.rows[0].id);
        } catch (e) { if (DEBUG) console.warn('lookup dosen by email failed', e.message); }
      }
    }

    const params = [];
    const where = [];
    if (prodi) { params.push(String(prodi)); where.push(`LOWER(TRIM(prodi)) = LOWER(TRIM($${params.length}))`); }
    if (tahun_angkatan) { params.push(String(tahun_angkatan)); where.push(`TRIM(tahun_angkatan) = TRIM($${params.length})`); }
    if (kode_matkul) { params.push(String(kode_matkul)); where.push(`LOWER(TRIM(kode_matkul)) = LOWER(TRIM($${params.length}))`); }
    if (dosen_id) { params.push(Number(dosen_id)); where.push(`dosen_id = $${params.length}`); }

    let q = `SELECT id, judul, dosen_id, prodi, tahun_angkatan, COALESCE(kode_matkul,'') AS kode_matkul, deskripsi, to_char(deadline,'YYYY-MM-DD') AS deadline, file_path, file_name, status, created_at FROM tugas`;
    if (where.length) q += ' WHERE ' + where.join(' AND ');
    q += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(q, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/tugas error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

/**
 * GET /api/tugas/available?nim=...
 * Show tasks visible to student: tasks with no kode_matkul OR student enrolled in KRS for that kode_matkul.
 * If student prodi/tahun available, filter by them; otherwise only apply kode_matkul rule.
 */
router.get('/tugas/available', async (req, res) => {
  try {
    await ensureTables();
    const { nim } = req.query;
    if (!nim) return res.status(400).json({ error: 'nim required' });

    // detect mahasiswa columns
    const colRes = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'mahasiswa' AND table_schema = current_schema()
    `);
    const cols = colRes.rows.map(r => r.column_name);
    const prodiCol = cols.includes('prodi') ? 'prodi' :
                     cols.includes('program_studi') ? 'program_studi' :
                     cols.includes('jurusan') ? 'jurusan' :
                     cols.includes('nama_prodi') ? 'nama_prodi' : null;
    const tahunCol = cols.includes('tahun_angkatan') ? 'tahun_angkatan' :
                     cols.includes('angkatan') ? 'angkatan' :
                     cols.includes('tahun_masuk') ? 'tahun_masuk' : null;

    const selectCols = ['nim'];
    if (prodiCol) selectCols.push(prodiCol);
    if (tahunCol) selectCols.push(tahunCol);
    const sres = await pool.query(`SELECT ${selectCols.join(', ')} FROM mahasiswa WHERE nim = $1 LIMIT 1`, [String(nim)]);
    if (!sres.rows.length) return res.status(404).json({ error: 'Mahasiswa tidak ditemukan' });
    const stuRow = sres.rows[0];
    const stuProdi = prodiCol ? String(stuRow[prodiCol] || '').trim() : '';
    const stuTahun = tahunCol ? String(stuRow[tahunCol] || '').trim() : '';

    const params = [String(nim)];
    const whereParts = [];

    if (stuProdi) {
      params.push(stuProdi);
      whereParts.push(`(t.prodi IS NULL OR LOWER(TRIM(t.prodi)) = LOWER(TRIM($${params.length})))`);
    }
    if (stuTahun) {
      params.push(stuTahun);
      whereParts.push(`(t.tahun_angkatan IS NULL OR TRIM(t.tahun_angkatan) = TRIM($${params.length}))`);
    }

    let q = `
      SELECT DISTINCT t.id, t.judul, t.dosen_id, t.prodi, t.tahun_angkatan, COALESCE(TRIM(t.kode_matkul),'') AS kode_matkul,
             t.deskripsi, to_char(t.deadline,'YYYY-MM-DD') AS deadline, t.file_path, t.file_name, t.status, t.created_at
      FROM tugas t
      LEFT JOIN krs k ON (k.nim = $1 AND TRIM(k.kode_matkul) <> '' AND TRIM(k.kode_matkul) = TRIM(t.kode_matkul))
    `;

    if (whereParts.length) {
      q += ' WHERE ' + whereParts.join(' AND ');
      q += ` AND ( t.kode_matkul IS NULL OR TRIM(t.kode_matkul) = '' OR k.nim IS NOT NULL )`;
    } else {
      q += ` WHERE ( t.kode_matkul IS NULL OR TRIM(t.kode_matkul) = '' OR k.nim IS NOT NULL )`;
    }

    q += ' ORDER BY t.created_at DESC';

    const { rows } = await pool.query(q, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/tugas/available error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

/**
 * POST /api/tugas/:id/submit
 * Accept submission. If student already submitted for this tugas -> return 409 with existing submission.
 * Student nim resolved from request body OR session (req.session.user.nim / username / id) OR query.
 */
router.post('/tugas/:id/submit', upload.single('file'), async (req, res) => {
  try {
    await ensureTables();
    const tugasId = Number(req.params.id);
    if (!tugasId) return res.status(400).json({ error: 'Tugas id invalid' });

    // Resolve nim priority: body.nim -> session.user.* -> query.nim
    let nim = null;
    try { if (req.body && req.body.nim) nim = String(req.body.nim).trim(); } catch(e){}
    try {
      if (!nim && req.session && req.session.user) {
        const u = req.session.user;
        nim = u.nim || u.student_nim || u.username || (u.id ? String(u.id) : null) || null;
        if (nim) nim = String(nim).trim();
      }
    } catch (e) {}
    try { if (!nim && req.query && req.query.nim) nim = String(req.query.nim).trim(); } catch(e){}

    if (!nim) {
      return res.status(400).json({ error: 'NIM tidak ditemukan. Silakan login atau sertakan nim di body.' });
    }

    const { nama, komentar } = req.body || {};

    // Ensure tugas exists
    const t = await pool.query('SELECT id, dosen_id FROM tugas WHERE id = $1 LIMIT 1', [tugasId]);
    if (!t.rows.length) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    // Check existing submission for same tugas + nim
    const exist = await pool.query('SELECT id, tugas_id, nim, nama, komentar, file_path, file_name, to_char(submitted_at,\'YYYY-MM-DD"T"HH24:MI:SSZ\') AS submitted_at, grade, feedback FROM submissions WHERE tugas_id = $1 AND nim = $2 LIMIT 1', [tugasId, String(nim)]);
    if (exist.rows.length) {
      // Return 409 with existing submission so frontend can mark it as submitted
      return res.status(409).json({ error: 'Sudah mengumpulkan tugas ini', submission: exist.rows[0] });
    }

    const filePath = req.file ? path.relative(process.cwd(), req.file.path) : null;
    const fileName = req.file ? req.file.originalname : null;

    const q = `INSERT INTO submissions (tugas_id, nim, nama, komentar, file_path, file_name)
               VALUES ($1,$2,$3,$4,$5,$6)
               RETURNING id, tugas_id, nim, nama, komentar, file_path, file_name, to_char(submitted_at,'YYYY-MM-DD"T"HH24:MI:SSZ') AS submitted_at, grade, feedback`;
    const params = [tugasId, String(nim), nama || null, komentar || null, filePath, fileName];
    const { rows } = await pool.query(q, params);
    // success: return inserted row
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/tugas/:id/submit error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Gagal mengirim tugas', details: err && err.message ? err.message : String(err) });
  }
});

/**
 * GET /api/tugas/:id/submissions
 */
router.get('/tugas/:id/submissions', async (req, res) => {
  try {
    await ensureTables();
    const tugasId = Number(req.params.id);
    if (!tugasId) return res.status(400).json({ error: 'Tugas id invalid' });

    const { rows } = await pool.query(
      `SELECT id, tugas_id, nim, nama, komentar, file_path, file_name, to_char(submitted_at,'YYYY-MM-DD"T"HH24:MI:SSZ') AS submitted_at, grade, feedback
       FROM submissions WHERE tugas_id = $1 ORDER BY submitted_at DESC`, [tugasId]
    );
    const out = attachFileUrlToRows(req, rows);
    return res.json(out);
  } catch (err) {
    console.error('GET /api/tugas/:id/submissions error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

/**
 * GET /api/dosen/:id/submissions
 */
router.get('/dosen/:id/submissions', async (req, res) => {
  try {
    await ensureTables();
    const dosenId = Number(req.params.id);
    if (!dosenId) return res.status(400).json({ error: 'Invalid dosen id' });

    const q = `
      SELECT s.id, s.tugas_id, t.judul, s.nim, s.nama, s.komentar, s.file_path, s.file_name, to_char(s.submitted_at,'YYYY-MM-DD"T"HH24:MI:SSZ') AS submitted_at
      FROM submissions s
      JOIN tugas t ON t.id = s.tugas_id
      WHERE t.dosen_id = $1
      ORDER BY s.submitted_at DESC
    `;
    const { rows } = await pool.query(q, [dosenId]);
    const out = attachFileUrlToRows(req, rows);
    return res.json(out);
  } catch (err) {
    console.error('GET /api/dosen/:id/submissions error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});


router.get('/submissions', async (req, res) => {
  try {
    await ensureTables();
    const { nim } = req.query;
    if (!nim) return res.status(400).json({ error: 'nim required' });

    const { rows } = await pool.query(
      `SELECT id, tugas_id, nim, nama, komentar, file_path, file_name, to_char(submitted_at,'YYYY-MM-DD"T"HH24:MI:SSZ') AS submitted_at, grade, feedback
       FROM submissions WHERE nim = $1 ORDER BY submitted_at DESC`, [String(nim)]
    );
    const out = attachFileUrlToRows(req, rows);
    return res.json(out);
  } catch (err) {
    console.error('GET /api/submissions error', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;