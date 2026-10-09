const express = require('express');
const { nanoid, customAlphabet } = require('nanoid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const inviteAlphabet = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

router.use(authMiddleware);

function isMember(diaryId, userId) {
  return db
    .prepare('SELECT 1 FROM diary_members WHERE diary_id = ? AND user_id = ?')
    .get(diaryId, userId);
}

function toDiaryDto(row) {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// 自分が参加している日記帳の一覧
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT d.* FROM diaries d
       JOIN diary_members m ON m.diary_id = d.id
       WHERE m.user_id = ?
       ORDER BY d.created_at DESC`
    )
    .all(req.user.id);
  res.json({ diaries: rows.map(toDiaryDto) });
});

// 日記帳を新規作成（作成者が最初のメンバーになる）
router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'name は必須です' });
  }

  const id = nanoid();
  const inviteCode = inviteAlphabet();

  const tx = db.transaction(() => {
    db.prepare(
      'INSERT INTO diaries (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)'
    ).run(id, name, inviteCode, req.user.id);
    db.prepare(
      'INSERT INTO diary_members (diary_id, user_id) VALUES (?, ?)'
    ).run(id, req.user.id);
  });
  tx();

  const row = db.prepare('SELECT * FROM diaries WHERE id = ?').get(id);
  res.status(201).json({ diary: toDiaryDto(row) });
});

// 招待コードで日記帳に参加
router.post('/join', (req, res) => {
  const { inviteCode } = req.body || {};
  if (!inviteCode) {
    return res.status(400).json({ error: 'inviteCode は必須です' });
  }

  const diary = db
    .prepare('SELECT * FROM diaries WHERE invite_code = ?')
    .get(inviteCode.toUpperCase());
  if (!diary) {
    return res.status(404).json({ error: '招待コードが見つかりません' });
  }

  if (!isMember(diary.id, req.user.id)) {
    db.prepare(
      'INSERT INTO diary_members (diary_id, user_id) VALUES (?, ?)'
    ).run(diary.id, req.user.id);
  }

  res.json({ diary: toDiaryDto(diary) });
});

// 日記帳の詳細（メンバー一覧含む）
router.get('/:id', (req, res) => {
  const diary = db.prepare('SELECT * FROM diaries WHERE id = ?').get(req.params.id);
  if (!diary || !isMember(diary.id, req.user.id)) {
    return res.status(404).json({ error: '日記帳が見つかりません' });
  }

  const members = db
    .prepare(
      `SELECT u.id, u.username, u.display_name AS displayName
       FROM diary_members m JOIN users u ON u.id = m.user_id
       WHERE m.diary_id = ?`
    )
    .all(diary.id);

  res.json({ diary: toDiaryDto(diary), members });
});

module.exports = router;
