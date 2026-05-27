import SuperAdminNavbar from "@/components/(navbars)/superAdminNavbar";
import { ReactNode } from "react";

const SuperAdminLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <SuperAdminNavbar />
      <main className="p-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">{children}</div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
