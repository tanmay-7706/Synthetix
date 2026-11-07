import { db } from "@/lib/prisma";

/**
 * Checks whether the given Clerk user ID has administrator privileges.
 * Supports:
 * - Specific Clerk ID via ADMIN_CLERK_ID
 * - "auto" mode: the first user created in the database is granted admin
 */
export async function isAdmin(
  clerkId: string | null | undefined
): Promise<boolean> {
  if (!clerkId) return false;

  const adminId = process.env.ADMIN_CLERK_ID;
  if (!adminId) return false;

  if (adminId === "auto") {
    try {
      const firstUser = await db.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { clerkId: true },
      });
      return firstUser?.clerkId === clerkId;
    } catch {
      return false;
    }
  }

  return clerkId === adminId;
}

