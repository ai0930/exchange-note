import { FormEvent, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { api } from "./lib/api";
import type { Diary, Entry, User } from "./lib/api";
import { useAuth } from "./lib/AuthContext";

const reactions = ["💛", "👏", "🌱", "✨"];

function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (isRegister) {
        await signUp(
          String(form.get("username")).trim(),
          String(form.get("password")),
          String(form.get("displayName")).trim(),
        );
      } else {
        await signIn(
          String(form.get("username")).trim(),
          String(form.get("password")),
        );
      }
      navigate("/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "処理に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link className="brand brand-light" to="/">
          <span className="brand-mark">📒</span>交換日記
        </Link>
        <div className="story-copy">
          <p className="eyebrow">A LITTLE SPACE, TOGETHER</p>
          <h1>
            離れていても、
            <br />
            同じページに。
          </h1>
          <p>
            今日のこと、ふと思ったこと。大切な人と、ゆっくり書き交わす場所。
          </p>
        </div>
        <div className="story-note" aria-hidden="true">
          <span>きょうのひとこと</span>
          <p>
            小さなことも、
            <br />
            書くとちゃんと残るね。
          </p>
          <div className="note-signature">
            <span>ふたりの交換ノート</span>
            <b>✳</b>
          </div>
        </div>
        <span className="story-sun" aria-hidden="true">
          ✳
        </span>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">YOUR SHARED JOURNAL</p>
          <h2>{isRegister ? "はじめまして。" : "おかえりなさい。"}</h2>
          <p className="form-intro">
            {isRegister
              ? "あなたの場所をつくりましょう。"
              : "ノートの続きをひらきましょう。"}
          </p>
          <form className="stack-form" onSubmit={submit}>
            {isRegister && (
              <label>
                表示名
                <input
                  name="displayName"
                  autoComplete="name"
                  required
                  maxLength={32}
                  placeholder="ノートに表示する名前"
                />
              </label>
            )}
            <label>
              ユーザー名
              <input
                name="username"
                autoComplete="username"
                required
                maxLength={32}
                placeholder="ユーザー名"
              />
            </label>
            <label>
              パスワード
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={6}
                placeholder="6文字以上"
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary button-wide"
              disabled={busy}
            >
              {busy
                ? "お待ちください…"
                : isRegister
                  ? "アカウントをつくる"
                  : "ノートをひらく"}{" "}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="auth-switch">
            {isRegister ? "アカウントをお持ちですか？" : "はじめて使いますか？"}{" "}
            <button
              className="text-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "ログイン" : "新規登録"}
            </button>
          </p>
        </div>
        <span className="auth-footnote">ひとことずつ、ふたりの記録に。</span>
      </section>
    </main>
  );
}

function Workspace() {
  const { user, signOut } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [dialog, setDialog] = useState<"create" | "join" | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { diaryId } = useParams();
  const activeDiary = diaries.find((diary) => diary.id === diaryId);

  useEffect(() => {
    api
      .listDiaries()
      .then(({ diaries: nextDiaries }) => setDiaries(nextDiaries))
      .catch(() => setDiaries([]));
  }, [refresh]);

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setActionError("");
    const form = new FormData(event.currentTarget);
    try {
      if (dialog === "create") {
        const { diary } = await api.createDiary(
          String(form.get("name")).trim(),
        );
        setRefresh((value) => value + 1);
        setDialog(null);
        navigate(`/diary/${diary.id}`);
      } else {
        const { diary } = await api.joinDiary(
          String(form.get("inviteCode")).trim(),
        );
        setRefresh((value) => value + 1);
        setDialog(null);
        navigate(`/diary/${diary.id}`);
      }
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "処理に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">交</span>交換ノート
        </Link>
        <div className="sidebar-label">
          あなたのノート{" "}
          <span>{diaries.length.toString().padStart(2, "0")}</span>
        </div>
        <nav className="diary-nav" aria-label="ノート一覧">
          {diaries.map((diary) => (
            <Link
              key={diary.id}
              className={`diary-link ${diary.id === diaryId ? "selected" : ""}`}
              to={`/diary/${diary.id}`}
            >
              <span className="diary-dot">✳</span>
              <span className="diary-link-name">{diary.name}</span>
              <span className="diary-arrow">↗</span>
            </Link>
          ))}
          {!diaries.length && (
            <p className="sidebar-empty">
              まだノートがありません。
              <br />
              新しいノートを作るか、招待コードで参加しましょう。
            </p>
          )}
        </nav>
        <div className="sidebar-actions">
          <button
            className="side-action"
            onClick={() => {
              setActionError("");
              setDialog("create");
            }}
          >
            <span>＋</span> ノートをつくる
          </button>
          <button
            className="side-action"
            onClick={() => {
              setActionError("");
              setDialog("join");
            }}
          >
            <span>↗</span> 招待コードで参加
          </button>
        </div>
        <div className="profile-row">
          <span className="avatar">
            {user?.displayName.slice(0, 1) || "私"}
          </span>
          <span className="profile-name">{user?.displayName}</span>
          <button
            className="signout"
            onClick={signOut}
            aria-label="ログアウト"
            title="ログアウト"
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="main-panel">
        {diaryId ? (
          <DiaryPage diary={activeDiary} diaryId={diaryId} currentUser={user} />
        ) : (
          <HomePage
            user={user}
            diaries={diaries}
            onCreate={() => setDialog("create")}
            onJoin={() => setDialog("join")}
          />
        )}
      </main>

      {dialog && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button
              className="dialog-close"
              onClick={() => setDialog(null)}
              aria-label="閉じる"
            >
              ×
            </button>
            <p className="eyebrow">
              {dialog === "create" ? "A NEW SHARED PAGE" : "COME ON IN"}
            </p>
            <h2 id="dialog-title">
              {dialog === "create" ? "ノートをつくる" : "ノートに参加する"}
            </h2>
            <p className="dialog-copy">
              {dialog === "create"
                ? "名前をつけたら、招待コードを大切な人に共有しましょう。"
                : "共有された8桁の招待コードを入力してください。"}
            </p>
            <form className="stack-form" onSubmit={submitAction}>
              <label>
                {dialog === "create" ? "ノートの名前" : "招待コード"}
                <input
                  autoFocus
                  name={dialog === "create" ? "name" : "inviteCode"}
                  maxLength={dialog === "create" ? 40 : 8}
                  required
                  placeholder={
                    dialog === "create"
                      ? "例：わたしたちの交換日記"
                      : "例：AB12CD34"
                  }
                />
              </label>
              {actionError && (
                <p className="form-error" role="alert">
                  {actionError}
                </p>
              )}
              <button
                className="button button-primary button-wide"
                disabled={busy}
              >
                {busy
                  ? "お待ちください…"
                  : dialog === "create"
                    ? "ノートをつくる"
                    : "参加する"}{" "}
                <span aria-hidden="true">↗</span>
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function HomePage({
  user,
  diaries,
  onCreate,
  onJoin,
}: {
  user: User | null;
  diaries: Diary[];
  onCreate: () => void;
  onJoin: () => void;
}) {
  const date = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
  return (
    <div className="home-page">
      <header className="topline">
        <span>{date}</span>
        <span className="online-mark">
          <i /> YOUR PRIVATE SPACE
        </span>
      </header>
      <section className="welcome-block">
        <p className="eyebrow">A PAGE TO COME BACK TO</p>
        <h1>
          {user?.displayName}さん、
          <br className="mobile-break" />
          おかえりなさい。
        </h1>
        <p className="welcome-copy">
          誰かと交わした言葉が、今日のあなたを待っています。
        </p>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR COLLECTION</p>
            <h2>ひらくノート</h2>
          </div>
          <span className="section-count">
            {String(diaries.length).padStart(2, "0")} <small>冊</small>
          </span>
        </div>
        {diaries.length ? (
          <div className="diary-grid">
            {diaries.map((diary, index) => (
              <Link
                className="diary-card"
                to={`/diary/${diary.id}`}
                key={diary.id}
              >
                <span className={`card-index card-color-${index % 3}`}>
                  0{index + 1}
                </span>
                <span className="card-spark">✳</span>
                <h3>{diary.name}</h3>
                <span className="card-open">
                  ノートをひらく <b>↗</b>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-star">✳</span>
            <div>
              <h3>最初のページをつくりましょう。</h3>
              <p>あなたのノートをつくるか、招待コードから参加できます。</p>
            </div>
            <button className="button button-dark" onClick={onCreate}>
              ノートをつくる <span>＋</span>
            </button>
          </div>
        )}
        <div className="home-actions">
          <button onClick={onCreate}>＋ 新しいノート</button>
          <button onClick={onJoin}>↗ 招待コードで参加</button>
        </div>
      </section>
      <footer className="home-footer">
        <span>書いた言葉は、ふたりのもの。</span>
        <span>
          交換ノート <b>✳</b>
        </span>
      </footer>
    </div>
  );
}

function DiaryPage({
  diary,
  diaryId,
  currentUser,
}: {
  diary?: Diary;
  diaryId: string;
  currentUser: User | null;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([api.listEntries(diaryId), api.getDiary(diaryId)])
      .then(([entryResult, diaryResult]) => {
        if (alive) {
          setEntries(entryResult.entries);
          setMembers(diaryResult.members);
        }
      })
      .catch((reason: unknown) => {
        if (alive)
          setError(
            reason instanceof Error
              ? reason.message
              : "ノートを読み込めませんでした",
          );
      });
    return () => {
      alive = false;
    };
  }, [diaryId]);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { entry } = await api.createEntry(diaryId, content.trim());
      setEntries((current) => [entry, ...current]);
      setContent("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "投稿できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleReaction(entryId: string, emoji: string) {
    try {
      const { reactions: nextReactions } = await api.toggleReaction(
        entryId,
        emoji,
      );
      setEntries((current) =>
        current.map((entry) =>
          entry.id === entryId ? { ...entry, reactions: nextReactions } : entry,
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "リアクションできませんでした",
      );
    }
  }

  async function copyInvite() {
    if (!diary?.inviteCode) return;
    await navigator.clipboard.writeText(diary.inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="diary-page">
      <header className="topline">
        <Link to="/" className="breadcrumb">
          すべてのノート <span>/</span> {diary?.name || "ノート"}
        </Link>
        <span className="online-mark">
          <i /> PRIVATE JOURNAL
        </span>
      </header>
      <section className="diary-heading">
        <p className="eyebrow">
          A SHARED JOURNAL <span>✳</span>
        </p>
        <h1>{diary?.name || "ノート"}</h1>
        <div className="diary-meta">
          <span>{members.length}人で交換中</span>
          <span>·</span>
          <span>
            招待コード <b>{diary?.inviteCode || "--------"}</b>
          </span>
          <button onClick={copyInvite}>
            {copied ? "コピーしました ✓" : "コードをコピー"}
          </button>
        </div>
      </section>
      <form className="entry-composer" onSubmit={addEntry}>
        <div className="composer-top">
          <span className="avatar">
            {currentUser?.displayName.slice(0, 1) || "私"}
          </span>
          <span>今日はどんな一日でしたか？</span>
          <span className="composer-date">
            {new Intl.DateTimeFormat("ja-JP", {
              month: "short",
              day: "numeric",
            }).format(new Date())}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={5000}
          placeholder="ここに、今日のことを書いてみる…"
          aria-label="ノートに書く内容"
        />
        <div className="composer-bottom">
          <span>
            {content.length > 0
              ? `${content.length} / 5000`
              : "あなたの言葉で、ページをひらく。"}
          </span>
          <button
            className="button button-dark"
            disabled={busy || !content.trim()}
          >
            {busy ? "投稿中…" : "ページに書く"} <span>↗</span>
          </button>
        </div>
      </form>
      {error && (
        <p className="form-error page-error" role="alert">
          {error}
        </p>
      )}
      <section className="entries-section">
        <div className="entries-title">
          <h2>ノートのページ</h2>
          <span>{entries.length} POSTS</span>
        </div>
        {entries.length ? (
          <div className="entry-list">
            {entries.map((entry) => (
              <article className="entry" key={entry.id}>
                <div className="entry-avatar">
                  {entry.authorName.slice(0, 1)}
                </div>
                <div className="entry-body">
                  <div className="entry-byline">
                    <strong>{entry.authorName}</strong>
                    <time>
                      {new Intl.DateTimeFormat("ja-JP", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(entry.createdAt))}
                    </time>
                  </div>
                  <p className="entry-content">{entry.content}</p>
                  <div className="reaction-row">
                    {reactions.map((emoji) => {
                      const matching = entry.reactions.filter(
                        (reaction) => reaction.emoji === emoji,
                      );
                      const mine = matching.some(
                        (reaction) => reaction.userId === currentUser?.id,
                      );
                      return (
                        <button
                          key={emoji}
                          className={`reaction ${mine ? "reacted" : ""}`}
                          onClick={() => toggleReaction(entry.id, emoji)}
                          aria-label={`${emoji} リアクション${matching.length ? ` ${matching.length}件` : ""}`}
                          aria-pressed={mine}
                        >
                          {emoji}
                          {matching.length > 0 && (
                            <span>{matching.length}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="entries-empty">
            <span>✳</span>
            <p>
              このノートは、まだまっさらです。
              <br />
              最初のページを書いてみませんか？
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();
  if (!user) return <AuthPage />;
  return (
    <Routes>
      <Route path="/" element={<Workspace />} />
      <Route path="/diary/:diaryId" element={<Workspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
