const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const authRouter = require('./routes/auth');
const dashboardMhsRouter = require('./routes/dashboardmhs');
const absenRouter = require('./routes/absen');
const matkulRouter = require('./routes/matkul');
const krsRouter = require('./routes/krs');
const tugasRouter = require('./routes/tugas');
const nilaiRouter = require('./routes/nilai');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed frontend origin(s) - ganti sesuai origin dev Anda
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS && process.env.FRONTEND_ORIGINS.split(',')) || [
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS: must allow specific origin when using credentials
// Minimal change: allow the custom headers used for dev testing (x-user-role, x-dosen-id)
const corsOptions = {
  origin: (origin, callback) => {
    // allow non-browser requests (no origin) and allow origins in whitelist
    if (!origin) return callback(null, true);
    if (FRONTEND_ORIGINS.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  // include any custom headers you need for development testing here
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Dosen-Id', 'x-dosen-id', 'x-user-role', 'x-requested-with']
};

app.use(cors(corsOptions));
// lightweight middleware to ensure the expected CORS headers are present for OPTIONS responses
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // only set these when origin is allowed to avoid leaking headers to disallowed origins
    const origin = req.headers.origin;
    if (!origin || FRONTEND_ORIGINS.indexOf(origin) !== -1) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Dosen-Id, x-dosen-id, x-user-role, x-requested-with');
    }
    return res.sendStatus(204);
  }
  next();
});

// Session (development settings)
// In production: use persistent store and secure:true with HTTPS
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,    // must be false for http://localhost in dev
    sameSite: 'lax',  // change to 'none' + secure:true for cross-site cookies over HTTPS
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Routers (after cors/session)
app.use('/api', authRouter);
app.use('/api', dashboardMhsRouter);
app.use('/api', absenRouter);

app.use('/api', nilaiRouter);
app.use('/api/nilai', nilaiRouter); 


app.use('/api', matkulRouter);
app.use('/api', krsRouter);
app.use('/api', tugasRouter);

// static uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug route (dev only)
app.get('/debug/session', (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionUser: req.session ? req.session.user : null,
    cookiesHeader: req.headers.cookie || null
  });
});


app.get('/debug/routes', (req, res) => {
  const out = [];
  const stack = app._router && app._router.stack ? app._router.stack : [];
  stack.forEach(layer => {
    if (layer.route && layer.route.path) {
      out.push({ path: layer.route.path, methods: Object.keys(layer.route.methods).join(',').toUpperCase() });
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      const mountPath = layer.regexp && layer.regexp.source ? layer.regexp.source : 'router';
      layer.handle.stack.forEach(l => {
        if (l.route && l.route.path) {
          out.push({ mount: mountPath, path: l.route.path, methods: Object.keys(l.route.methods).join(',').toUpperCase() });
        }
      });
    }
  });
  res.json({ routes: out });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});