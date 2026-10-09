const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function issueToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

router.post('/register', (req, res) => {
  const { username, password, displayName } = req.body || {};

  if (!username || !password || !displayName) {
    return res.status(400).json({ error: 'username, password, displayName は必須です' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'パスワードは6文字以上にしてください' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'このユーザー名は既に使われています' });
  }

  const id = nanoid();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (id, username, display_name, password_hash) VALUES (?, ?, ?, ?)'
  ).run(id, username, displayName, passwordHash);

  const user = { id, username, displayName };
  const token = issueToken(user);
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username, password は必須です' });
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが違います' });
  }

  const user = { id: row.id, username: row.username, displayName: row.display_name };
  const token = issueToken(user);
  res.json({ token, user });
});

module.exports = router;
