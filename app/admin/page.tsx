
import AdminDashboardPage from "@/components/(superAdmin)/superAdminDashboard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const SuperAdminDashboard=async()=>{
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const sessionUser = session?.user;

    // Not logged in
    if (!sessionUser) {
      redirect("/signin");
    }

    // Role protection
    if (sessionUser.role !== "SUPER_ADMIN") {
      redirect("/signin");
    }
    return(
        <>
            <AdminDashboardPage />
        </>
    )
}
export default SuperAdminDashboard