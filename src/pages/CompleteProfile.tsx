import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import { EnhancedProfileForm } from "@/components/profile/EnhancedProfileForm";
import { useAuth } from "@/hooks/useAuth";

export default function CompleteProfile() {
  const { redirectToRoleBasedPortal, userRole } = useAuth();
  const navigate = useNavigate();

  const handleComplete = () => {
    const path = redirectToRoleBasedPortal(userRole || 'student');
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-10">
        <EnhancedProfileForm onComplete={handleComplete} />
      </div>
    </div>
  );
}
