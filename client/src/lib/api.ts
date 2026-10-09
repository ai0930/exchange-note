export type User = {
  id: string;
  username: string;
  displayName: string;
};

export type Diary = {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
};

export type Reaction = {
  emoji: string;
  displayName: string;
  userId: string;
};

export type Entry = {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  reactions: Reaction[];
};

const TOKEN_KEY = 'exchange-note-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'リクエストに失敗しました');
  }
  return data as T;
}

export const api = {
  register: (username: string, password: string, displayName: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    }),

  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  listDiaries: () => request<{ diaries: Diary[] }>('/diaries'),

  createDiary: (name: string) =>
    request<{ diary: Diary }>('/diaries', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  joinDiary: (inviteCode: string) =>
    request<{ diary: Diary }>('/diaries/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    }),

  getDiary: (id: string) =>
    request<{ diary: Diary; members: User[] }>(`/diaries/${id}`),

  listEntries: (diaryId: string) =>
    request<{ entries: Entry[] }>(`/diaries/${diaryId}/entries`),

  createEntry: (diaryId: string, content: string) =>
    request<{ entry: Entry }>(`/diaries/${diaryId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  toggleReaction: (entryId: string, emoji: string) =>
    request<{ reactions: Reaction[] }>(`/entries/${entryId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    }),
};
