import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { login as loginRequest } from "../api/auth";
import type { User } from "../types/auth";

interface AuthContextValue {
  user: User | null;
  isSigningIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the authenticated user for the whole app. No token is used: signIn
 * stores the { id, role } returned by the backend in memory and signOut clears
 * it. RootNavigator reads this state to decide which navigation stack to show.
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
          setUser(await loginRequest(email, password));
        } finally {
          setIsSigningIn(false);
        }
      },
      signOut() {
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
