import { GradientBackground } from "@/components/ui/gradient-background";
import { StudentPortalLayout } from "@/components/dashboard/StudentPortalLayout";

const StudentPortal = () => {
  return (
    <GradientBackground variant="subtle" className="min-h-screen">
      <div className="container py-8">
        <StudentPortalLayout />
      </div>
    </GradientBackground>
  );
};

export default StudentPortal;