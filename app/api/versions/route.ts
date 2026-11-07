import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return Response.json(
      { message: "workspaceId is required" },
      { status: 400 }
    );
  }

  // Verify user existence and workspace ownership
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId, userId: user.id },
    select: { id: true },
  });
  if (!workspace) {
    return Response.json({ message: "Workspace not found" }, { status: 404 });
  }

  const versions = await db.version.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      createdAt: true,
    },
  });

  return Response.json({ versions });
}

export const runtime = "nodejs";
