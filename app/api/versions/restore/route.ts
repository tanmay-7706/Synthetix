import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { versionId, workspaceId } = body as {
    versionId: string;
    workspaceId: string;
  };

  if (!versionId || !workspaceId) {
    return Response.json(
      { message: "versionId and workspaceId are required" },
      { status: 400 }
    );
  }

  // Verify ownership
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

  // Fetch the version
  const version = await db.version.findUnique({
    where: { id: versionId, workspaceId },
  });
  if (!version) {
    return Response.json({ message: "Version not found" }, { status: 404 });
  }

  // Restore workspace to this version
  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      fileData: version.fileData as never,
      messages: version.messages as never,
    },
  });

  return Response.json({
    fileData: version.fileData,
    messages: version.messages,
  });
}

export const runtime = "nodejs";
