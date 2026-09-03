import { auth } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { db } from "@/lib/prisma";

// Lazy init — avoids crashing during Vercel static page collection
// when LIVEBLOCKS_SECRET_KEY is not yet set
function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret || !secret.startsWith("sk_")) {
    return null;
  }
  return new Liveblocks({ secret });
}

export async function POST(request: Request) {
  const liveblocks = getLiveblocks();
  if (!liveblocks) {
    return Response.json(
      { message: "Multiplayer not configured" },
      { status: 503 }
    );
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { room } = await request.json() as { room: string };
  if (!room) {
    return Response.json({ message: "Missing room" }, { status: 400 });
  }

  // Verify the user owns or has access to this workspace
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true, email: true, imageUrl: true },
  });

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  // Create a Liveblocks session for this user
  const session = liveblocks.prepareSession(`user-${user.id}`, {
    userInfo: {
      name: user.name,
      avatar: user.imageUrl,
      color: stringToColor(user.id),
    },
  });

  // Grant access to the specific workspace room
  session.allow(room, session.FULL_ACCESS);

  const { body, status } = await session.authorize();
  return new Response(body, { status });
}

// Deterministic color from user ID
function stringToColor(str: string): string {
  const colors = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#06b6d4", // cyan
    "#ec4899", // pink
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const runtime = "nodejs";
