const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function isMember(diaryId, userId) {
  return db
    .prepare('SELECT 1 FROM diary_members WHERE diary_id = ? AND user_id = ?')
    .get(diaryId, userId);
}

function entryWithReactions(entryId) {
  const reactions = db
    .prepare(
      `SELECT r.emoji, u.display_name AS displayName, r.user_id AS userId
       FROM reactions r JOIN users u ON u.id = r.user_id
       WHERE r.entry_id = ?`
    )
    .all(entryId);
  return reactions;
}

// 日記帳内のエントリ一覧（新しい順）
router.get('/diaries/:diaryId/entries', (req, res) => {
  const { diaryId } = req.params;
  if (!isMember(diaryId, req.user.id)) {
    return res.status(404).json({ error: '日記帳が見つかりません' });
  }

  const rows = db
    .prepare(
      `SELECT e.id, e.content, e.created_at AS createdAt,
              u.id AS authorId, u.display_name AS authorName
       FROM entries e JOIN users u ON u.id = e.author_id
       WHERE e.diary_id = ?
       ORDER BY e.created_at DESC`
    )
    .all(diaryId);

  const entries = rows.map((row) => ({
    ...row,
    reactions: entryWithReactions(row.id),
  }));

  res.json({ entries });
});

// エントリ投稿
router.post('/diaries/:diaryId/entries', (req, res) => {
  const { diaryId } = req.params;
  const { content } = req.body || {};

  if (!isMember(diaryId, req.user.id)) {
    return res.status(404).json({ error: '日記帳が見つかりません' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content は必須です' });
  }

  const id = nanoid();
  db.prepare(
    'INSERT INTO entries (id, diary_id, author_id, content) VALUES (?, ?, ?, ?)'
  ).run(id, diaryId, req.user.id, content.trim());

  const row = db
    .prepare(
      `SELECT e.id, e.content, e.created_at AS createdAt,
              u.id AS authorId, u.display_name AS authorName
       FROM entries e JOIN users u ON u.id = e.author_id
       WHERE e.id = ?`
    )
    .get(id);

  res.status(201).json({ entry: { ...row, reactions: [] } });
});

// エントリへのリアクション追加/削除（同じemojiを押すとトグル）
router.post('/entries/:entryId/reactions', (req, res) => {
  const { entryId } = req.params;
  const { emoji } = req.body || {};
  if (!emoji) {
    return res.status(400).json({ error: 'emoji は必須です' });
  }

  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
  if (!entry || !isMember(entry.diary_id, req.user.id)) {
    return res.status(404).json({ error: 'エントリが見つかりません' });
  }

  const existing = db
    .prepare('SELECT id FROM reactions WHERE entry_id = ? AND user_id = ? AND emoji = ?')
    .get(entryId, req.user.id, emoji);

  if (existing) {
    db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
  } else {
    db.prepare(
      'INSERT INTO reactions (id, entry_id, user_id, emoji) VALUES (?, ?, ?, ?)'
    ).run(nanoid(), entryId, req.user.id, emoji);
  }

  res.json({ reactions: entryWithReactions(entryId) });
});

module.exports = router;
