import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { User } from "./api";

type AuthContextValue = {
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (
    username: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = "exchange-note-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (getToken() && savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User);
      } catch {
        setToken(null);
        localStorage.removeItem(USER_KEY);
      }
    } else {
      setToken(null);
    }
  }, []);

  async function authenticate(result: { token: string; user: User }) {
    setToken(result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
  }

  async function signIn(username: string, password: string) {
    await authenticate(await api.login(username, password));
  }

  async function signUp(
    username: string,
    password: string,
    displayName: string,
  ) {
    await authenticate(await api.register(username, password, displayName));
  }

  function signOut() {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
