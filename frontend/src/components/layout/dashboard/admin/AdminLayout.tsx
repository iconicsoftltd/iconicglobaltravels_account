import AdminSidebarNavigationLargeDevice from "@/components/navigation/admin/AdminSidebarNavigationLargeDevice";
import AdminSidebarNavigationSmallDevice from "@/components/navigation/admin/AdminSidebarNavigationSmallDevice";
import AdminUpperNavigation from "@/components/navigation/admin/AdminUpperNavigation";
import { useState } from "react";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // Mobile Sidebar
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Upper Navigation */}
      <div className="w-full">
        <AdminUpperNavigation
          setMobileSidebarOpen={setMobileSidebarOpen}
        />
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Sidebar Section */}
        <AdminSidebarNavigationLargeDevice />
        <AdminSidebarNavigationSmallDevice
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />

        {/* Page Content */}
        <main
          className="min-h-0 min-w-0 flex-1 mt-[64px] h-[calc(100vh-64px)] bg-slate-50 transition-all duration-300 lg:ml-[280px] overflow-x-hidden overflow-y-auto"
        >
          <div className="min-h-full p-2 md:px-4 md:pb-6 md:pt-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

