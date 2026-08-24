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
