import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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