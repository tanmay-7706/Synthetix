import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";

// GET /api/components — list user's saved components
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const components = await db.component.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ components });
}

// POST /api/components — save a new component
export async function POST(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const body = await request.json() as {
    name: string;
    code: string;
    tags?: string[];
  };

  if (!body.name || !body.code) {
    return Response.json({ message: "Missing name or code" }, { status: 400 });
  }

  const component = await db.component.create({
    data: {
      userId: user.id,
      name: body.name,
      code: body.code,
      tags: body.tags ?? [],
    },
  });

  return Response.json({ component }, { status: 201 });
}

// DELETE /api/components?id=xxx — delete a component
export async function DELETE(request: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });

  if (!user) {
    return Response.json({ message: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ message: "Missing component ID" }, { status: 400 });
  }

  // Verify ownership
  const component = await db.component.findFirst({
    where: { id, userId: user.id },
  });

  if (!component) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  await db.component.delete({ where: { id } });
  return Response.json({ success: true });
}

export const runtime = "nodejs";
