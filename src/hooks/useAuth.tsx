import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  phone?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  error: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clean any legacy Supabase auth keys from localStorage (we now use sessionStorage)
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }, []);

  useEffect(() => {
    // Safety: if auth never responds, stop loading after 3s
    const safetyTimer = setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Auth is ready; don't block UI on profile fetch
        setLoading(false);

        if (session?.user) {
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", session.user.id)
              .maybeSingle();
            if (error) setError("Failed to fetch profile: " + error.message);
            setProfile(data);
          } catch (err: any) {
            setError("Unexpected error: " + err.message);
          }
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (error) setError("Failed to get session: " + error.message);
        // Auth readiness reached
        setLoading(false);
      })
      .catch((err) => {
        setError("Unexpected error: " + err.message);
        setLoading(false);
      });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
};