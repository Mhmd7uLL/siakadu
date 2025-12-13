const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth');
const dashboardMhsRouter = require('./routes/dashboardmhs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', authRouter);
app.use('/api', dashboardMhsRouter);

const matkulRouter = require('./routes/matkul');
app.use('/api', matkulRouter);

const krsRouter = require('./routes/krs');
app.use('/api', krsRouter);

const krsRoutes = require('./routes/krs');
app.use('/api', krsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});