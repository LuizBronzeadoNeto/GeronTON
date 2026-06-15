import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as loginRequest } from "../api/auth";
import { setAuthToken } from "../api/http";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isSigningIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the authenticated user for the whole app. signIn stores the
 * { id, role, token } returned by the backend in memory and registers the token
 * with the API client so authenticated requests carry it; signOut clears both.
 * RootNavigator reads this state to decide which navigation stack to show.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isSigningIn,
      async signIn(email, password) {
        setIsSigningIn(true);
        try {
          const signedIn = await loginRequest(email, password);
          setAuthToken(signedIn.token);
          setUser(signedIn);
        } finally {
          setIsSigningIn(false);
        }
      },
      signOut() {
        setAuthToken(null);
        setUser(null);
      },
    }),
    [user, isSigningIn],
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
