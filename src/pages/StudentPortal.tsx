import { StudentPortalLayout } from "@/components/dashboard/StudentPortalLayout";

const StudentPortal = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <div className="container py-8">
        <StudentPortalLayout />
      </div>
    </div>
  );
};

export default StudentPortal;