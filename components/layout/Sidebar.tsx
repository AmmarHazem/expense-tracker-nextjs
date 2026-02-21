import { auth, signOut } from "@/lib/auth";
import { NavLink } from "./NavLink";
import Image from "next/image";

export async function Sidebar({ onClose }: { onClose?: () => void }) {
  const session = await auth();
  const user = session?.user;

  return (
    <aside className="flex flex-col h-full bg-background border-r-2 border-border w-64 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b-2 border-border">
        <div className="label-mono text-foreground/40 mb-0.5">EXPENSE</div>
        <div className="text-2xl font-black text-foreground leading-none">TRACKER</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <NavLink href="/" icon="📊" label="Dashboard" />
        <NavLink href="/history" icon="📋" label="History" />
        <NavLink href="/analytics" icon="📈" label="Analytics" />
      </nav>

      {/* Categories Manager link */}
      <div className="px-3 pb-3">
        <NavLink href="/categories" icon="🏷️" label="Categories" />
      </div>

      {/* User */}
      <div className="p-3 border-t-2 border-border space-y-2">
        {user && (
          <div className="flex items-center gap-2">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={32}
                height={32}
                className="border-2 border-border"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-foreground truncate">
                {user.name}
              </div>
              <div className="text-xs text-foreground/50 font-mono truncate">
                {user.email}
              </div>
            </div>
          </div>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="brutalist-btn w-full bg-surface text-foreground text-xs py-2 px-3 uppercase tracking-wider font-bold"
          >
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
