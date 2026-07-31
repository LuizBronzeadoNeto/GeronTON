import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as loginRequest } from "../api/auth";
import { setAuthToken, setOnUnauthorized } from "../api/http";
import { clearSession, loadSession, saveSession } from "../api/session";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isSigningIn: boolean;
  isRestoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the authenticated user for the whole app. signIn stores the
 * { id, role, token } returned by the backend, registers the token with the API
 * client so authenticated requests carry it, and persists the session so the
 * user stays signed in across restarts; signOut clears all three.
 *
 * `isRestoring` is true until the stored session has been read on mount.
 * RootNavigator waits on it so the login screen does not flash before a restored
 * session is known.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const signOut = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    void clearSession();
  }, []);

  useEffect(() => {
    let active = true;

    void loadSession().then((stored) => {
      if (!active) {
        return;
      }

      if (stored) {
        setAuthToken(stored.token);
        setUser(stored);
      }

      setIsRestoring(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setOnUnauthorized(signOut);

    return () => {
      setOnUnauthorized(null);
    };
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isSigningIn,
      isRestoring,
      async signIn(email, password) {
        setIsSigningIn(true);
        try {
          const signedIn = await loginRequest(email, password);
          setAuthToken(signedIn.token);
          setUser(signedIn);
          await saveSession(signedIn);
        } finally {
          setIsSigningIn(false);
        }
      },
      signOut,
    }),
    [user, isSigningIn, isRestoring, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Access the auth context. Throws if used outside an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
