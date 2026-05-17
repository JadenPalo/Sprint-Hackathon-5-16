import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInAnonymously, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserRole } from "../types/inventory";
import { getFirebaseServices, isFirebaseEnabled } from "../lib/firebase";

interface AuthContextValue {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  role: UserRole;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const enabled = isFirebaseEnabled();
  const firebase = useMemo(() => getFirebaseServices(), [enabled]);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("staff");
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !firebase) {
      setLoading(false);
      setUser(null);
      setRole("staff");
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(firebase.auth, (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setRole("staff");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, [enabled, firebase]);

  useEffect(() => {
    if (!enabled || !firebase || !user) {
      return;
    }

    const userRef = doc(firebase.db, "users", user.uid);
    const unsubscribeUserDoc = onSnapshot(
      userRef,
      (snapshot) => {
        const snapshotRole = snapshot.data()?.role;
        setRole(snapshotRole === "admin" ? "admin" : "staff");
        setLoading(false);
      },
      () => {
        setRole("staff");
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUserDoc();
    };
  }, [enabled, firebase, user]);

  async function handleSignIn() {
    if (!enabled || !firebase) {
      return;
    }
    await signInAnonymously(firebase.auth);
  }

  async function handleSignOut() {
    if (!enabled || !firebase) {
      return;
    }
    await signOut(firebase.auth);
    setRole("staff");
  }

  return (
    <AuthContext.Provider
      value={{
        enabled,
        loading,
        user,
        role,
        signIn: handleSignIn,
        signOutUser: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}