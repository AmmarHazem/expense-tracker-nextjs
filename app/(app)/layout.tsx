import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ThemeSelector } from "@/components/layout/ThemeSelector";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sidebar = <Sidebar />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <TopBar sidebarContent={sidebar} />

        {/* Desktop header bar with theme controls */}
        <div className="hidden lg:flex items-center justify-end gap-2 px-6 py-3 border-b-2 border-border bg-background">
          <ThemeSelector />
          <ThemeToggle />
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
