import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// ─── Admin Stats API ──────────────────────────────────────────────────────────
// Protected: only allows the admin Clerk user.

async function isAdmin(clerkId: string): Promise<boolean> {
  const adminId = process.env.ADMIN_CLERK_ID;

  // "auto" mode: the first user in the database is the admin
  if (adminId === "auto") {
    const firstUser = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { clerkId: true },
    });
    return firstUser?.clerkId === clerkId;
  }

  return clerkId === adminId;
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!(await isAdmin(clerkId))) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  // ── Aggregate stats ─────────────────────────────────────────────────────────

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    usersToday,
    totalWorkspaces,
    workspacesToday,
    totalVersions,
    versionsToday,
    planBreakdown,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: todayStart } } }),
    db.workspace.count(),
    db.workspace.count({ where: { createdAt: { gte: todayStart } } }),
    db.version.count(),
    db.version.count({ where: { createdAt: { gte: todayStart } } }),
    db.user.groupBy({ by: ["plan"], _count: true }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { name: true, email: true, plan: true, credits: true, createdAt: true },
    }),
  ]);

  // ── Daily signups (last 30 days) ────────────────────────────────────────────

  const usersLast30 = await db.user.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
  });

  const signupsByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    signupsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const u of usersLast30) {
    const day = u.createdAt.toISOString().slice(0, 10);
    if (signupsByDay[day] !== undefined) signupsByDay[day]++;
  }

  // ── Daily generations (last 30 days) ────────────────────────────────────────

  const versionsLast30 = await db.version.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
  });

  const gensByDay: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    gensByDay[d.toISOString().slice(0, 10)] = 0;
  }
  for (const v of versionsLast30) {
    const day = v.createdAt.toISOString().slice(0, 10);
    if (gensByDay[day] !== undefined) gensByDay[day]++;
  }

  // ── Top prompts ─────────────────────────────────────────────────────────────

  const workspacesWithMessages = await db.workspace.findMany({
    select: { messages: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const promptCounts: Record<string, number> = {};
  for (const w of workspacesWithMessages) {
    const msgs = Array.isArray(w.messages) ? w.messages : [];
    const first = msgs.find(
      (m): m is { role: string; content: string } =>
        typeof m === "object" && m !== null && (m as { role?: string }).role === "user"
    );
    if (first?.content) {
      const snippet = first.content.slice(0, 80);
      promptCounts[snippet] = (promptCounts[snippet] ?? 0) + 1;
    }
  }

  const topPrompts = Object.entries(promptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([prompt, count]) => ({ prompt, count }));

  return Response.json({
    totalUsers,
    usersToday,
    totalWorkspaces,
    workspacesToday,
    totalVersions,
    versionsToday,
    planBreakdown: planBreakdown.map((p) => ({
      plan: p.plan,
      count: p._count,
    })),
    signupsByDay: Object.entries(signupsByDay).map(([date, count]) => ({
      date,
      count,
    })),
    gensByDay: Object.entries(gensByDay).map(([date, count]) => ({
      date,
      count,
    })),
    recentUsers,
    topPrompts,
  });
}

export const runtime = "nodejs";
