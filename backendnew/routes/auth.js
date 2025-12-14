const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

/**
 * Minimal, safe auth routes:
 * - register: create mahasiswa and set req.session.user (dev-friendly)
 * - login: authenticate mahasiswa/dosen, set req.session.user
 * - logout: destroy session and clear cookie
 * - session: return { user: ... } (empty object when no session) — used by frontend as fallback
 *
 * This preserves existing response shapes but additionally stores session user.
 * No other routes or contracts are changed.
 */

// REGISTER
router.post('/register', async (req, res) => {
  const { nama, nim, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO mahasiswa (nama, nim, email, password) VALUES ($1,$2,$3,$4) RETURNING *',
      [nama, nim, email, hashedPassword]
    );
    const user = result.rows[0];

    // set session user (student)
    try {
      req.session.user = {
        id: user.id,
        role: 'mahasiswa',
        name: user.nama,
        nim: user.nim
      };
      req.session.save(err => {
        if (err) {
          console.error('session save failed on register', err);
          const safe = { id: user.id, nama: user.nama, nim: user.nim, email: user.email };
          return res.json({ message: 'User registered (session save failed)', user: safe });
        }
        const safe = { id: user.id, nama: user.nama, nim: user.nim, email: user.email };
        return res.json({ message: 'User registered', user: safe });
      });
    } catch (sessErr) {
      console.warn('session set failed on register', sessErr);
      const safe = { id: user.id, nama: user.nama, nim: user.nim, email: user.email };
      return res.json({ message: 'User registered (no session)', user: safe });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// LOGIN
// ganti existing router.post('/login', ...) dengan handler ini
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // try mahasiswa first
    let userResult = await pool.query('SELECT * FROM mahasiswa WHERE email=$1', [email]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: 'Invalid password' });

      // optional additional info
      let namaProdi = null;
      try {
        const nimProdiId = user.nim && user.nim.length >= 4 ? user.nim.slice(2,4) : null;
        if (nimProdiId) {
          const prodiResult = await pool.query('SELECT nama_prodi FROM prodi WHERE id=$1', [nimProdiId]);
          namaProdi = prodiResult.rows.length > 0 ? prodiResult.rows[0].nama_prodi : null;
        }
      } catch (e) { /* ignore */ }

      // <-- SET SESSION USER HERE -->
      req.session.user = {
        id: user.id,
        role: 'mahasiswa',
        name: user.nama,
        nim: user.nim,
        prodi: namaProdi
      };

      // save session and return safe user (after save)
      return req.session.save(err => {
        if (err) {
          console.error('[AUTH] session save failed for mahasiswa', err);
          return res.status(500).json({ error: 'session save failed' });
        }
        console.log('[AUTH] login set session.user (mahasiswa):', req.session.user);
        const safe = { id: user.id, nama: user.nama, nim: user.nim, email: user.email, role: 'mahasiswa', prodi: namaProdi };
        return res.json(safe);
      });
    }

    // try dosen
    userResult = await pool.query('SELECT * FROM dosen WHERE email=$1', [email]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ error: 'Invalid password' });

      req.session.user = {
        id: user.id,
        role: 'dosen',
        name: user.nama,
        canAccKRS: user.canacckrs || false
      };

      return req.session.save(err => {
        if (err) {
          console.error('[AUTH] session save failed for dosen', err);
          return res.status(500).json({ error: 'session save failed' });
        }
        console.log('[AUTH] login set session.user (dosen):', req.session.user);
        const safe = { id: user.id, nama: user.nama, email: user.email, role: 'dosen', canAccKRS: user.canacckrs };
        return res.json(safe);
      });
    }

    return res.status(400).json({ error: 'Invalid email' });
  } catch (err) {
    console.error('[AUTH] login error', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        console.error('session destroy failed', err);
        return res.status(500).json({ error: 'logout failed' });
      }
      res.clearCookie(process.env.SESSION_COOKIE_NAME || 'connect.sid');
      return res.json({ ok: true });
    });
  } catch (e) {
    console.error('logout error', e);
    return res.status(500).json({ error: 'logout error' });
  }
});

// SESSION INFO (frontend uses this as fallback)
// returns { user: {...} } or { user: {} } if not logged in
router.get('/session', (req, res) => {
  try {
    if (req.session && req.session.user) {
      return res.json({ user: req.session.user });
    }
    return res.json({ user: {} });
  } catch (e) {
    console.error('GET /session error', e);
    return res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;