require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const diaryRoutes = require('./routes/diaries');
const entryRoutes = require('./routes/entries');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api', entryRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`exchange-note server listening on http://localhost:${PORT}`);
});
