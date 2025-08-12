import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  referral_code: string | null;
  date_of_birth: string | null;
  barcode: string | null;
  barcode_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  userRole: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  isAdmin: () => boolean;
  isCoAdmin: () => boolean;
  isInstructor: () => boolean;
  isStudent: () => boolean;
  isParent: () => boolean;
  canManageContent: () => boolean;
  canViewPayments: () => boolean;
  canManagePayments: () => boolean;
  refetch: () => Promise<void>;
  redirectToRoleBasedPortal: (userRole: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Idle timeout state (15 min inactivity, warn at 14 min)
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const warningTimeoutRef = useRef<number | null>(null);
  const logoutTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (roleError) throw roleError;
      setUserRole(roleData?.role || 'student');
    } catch (error) {
      console.error("Error fetching user data:", error);
      setProfile(null);
      setUserRole(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // ---- Idle timeout helpers ----
  const clearTimers = () => {
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) window.clearTimeout(logoutTimeoutRef.current);
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    warningTimeoutRef.current = null;
    logoutTimeoutRef.current = null;
    countdownIntervalRef.current = null;
  };

  const startTimers = () => {
    clearTimers();
    if (!user) return;

    // Show warning at 14 minutes
    warningTimeoutRef.current = window.setTimeout(() => {
      setIdleWarning(true);
      setCountdown(60);
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            window.clearInterval(countdownIntervalRef.current!);
          }
          return c - 1;
        });
      }, 1000);
    }, 14 * 60 * 1000);

    // Auto logout at 15 minutes
    logoutTimeoutRef.current = window.setTimeout(() => {
      signOut();
    }, 15 * 60 * 1000);
  };

  const resetTimers = () => {
    if (!user) return;
    setIdleWarning(false);
    clearTimers();
    startTimers();
  };

  const staySignedIn = () => {
    resetTimers();
  };

  // Start/clean timers when auth state changes
  useEffect(() => {
    if (user) {
      startTimers();
    } else {
      clearTimers();
      setIdleWarning(false);
    }
    return () => clearTimers();
  }, [user]);

  // Listen to user activity to reset timers
  useEffect(() => {
    if (!user) return;
    const activityHandler = () => resetTimers();
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') resetTimers();
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, activityHandler, { passive: true }));
    document.addEventListener('visibilitychange', visibilityHandler);
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, activityHandler));
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, [user]);

  const hasRole = (role: string) => {
    return userRole === role;
  };

  const hasAnyRole = (roles: string[]) => {
    return userRole ? roles.includes(userRole) : false;
  };

  const isAdmin = () => hasRole('admin');
  const isCoAdmin = () => hasRole('co_admin');
  const isInstructor = () => hasRole('instructor');
  const isStudent = () => hasRole('student');
  const isParent = () => hasRole('parent');
  const canManageContent = () => hasAnyRole(['admin', 'co_admin']);
  const canViewPayments = () => hasAnyRole(['admin', 'co_admin']);
  const canManagePayments = () => hasRole('admin');

  const refetch = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const redirectToRoleBasedPortal = (userRole: string) => {
    switch (userRole) {
      case 'admin':
      case 'co_admin':
        return '/admin-portal';
      case 'instructor':
        return '/coach-portal';
      case 'student':
        return '/student-portal';
      case 'parent':
        return '/parent-portal';
      default:
        return '/';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      userRole, 
      loading, 
      signOut,
      hasRole,
      hasAnyRole,
      isAdmin,
      isCoAdmin,
      isInstructor,
      isStudent,
      isParent,
      canManageContent,
      canViewPayments,
      canManagePayments,
      refetch,
      redirectToRoleBasedPortal
    }}>
      {children}
    </AuthContext.Provider>
  );
};