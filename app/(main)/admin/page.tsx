import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { AdminDashboard } from "@/components/AdminDashboard";

async function isAdmin(clerkId: string): Promise<boolean> {
  const adminId = process.env.ADMIN_CLERK_ID;

  if (adminId === "auto") {
    const firstUser = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { clerkId: true },
    });
    return firstUser?.clerkId === clerkId;
  }

  return clerkId === adminId;
}

export default async function AdminPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  if (!(await isAdmin(clerkId))) redirect("/");

  const user = await currentUser();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white/90">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/30">
            Analytics &amp; insights for Synthetix
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/40">
            {user?.firstName ?? "Admin"}
          </span>
        </div>
      </div>

      <AdminDashboard />
    </div>
  );
}
