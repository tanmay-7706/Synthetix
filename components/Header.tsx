import Link from "next/link";
import { UserButton, SignInButton, Show } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import { Zap, ArrowRight, BarChart3, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkUser } from "@/lib/checkUser";
import { PricingModal } from "@/components/PricingModal";
import { PLANS } from "@/lib/constants";
import { db } from "@/lib/prisma";
import type { Plan } from "@/types/plans";

export default async function Header() {
  const user = await checkUser();
  const { userId: clerkId } = await auth();

  // Check if the current user is admin
  let isAdmin = false;
  if (clerkId) {
    const adminId = process.env.ADMIN_CLERK_ID;
    if (adminId === "auto") {
      const firstUser = await db.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { clerkId: true },
      });
      isAdmin = firstUser?.clerkId === clerkId;
    } else {
      isAdmin = clerkId === adminId;
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/7 backdrop-blur-md">
      {/* Gradient bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <Image
            src="/logo.png"
            alt="Synthetix"
            width={300}
            height={100}
            className="h-14 w-auto rounded-md"
          />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-5">
          <Show when="signed-in">
            <Link
              href="/projects"
              className="text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
            >
              Projects
            </Link>

            <Link
              href="/library"
              className="flex items-center gap-1 text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
            >
              <PackageOpen className="h-3 w-3" />
              Library
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1 text-[13px] font-medium text-white/40 transition-colors hover:text-white/80"
              >
                <BarChart3 className="h-3 w-3" />
                Admin
              </Link>
            )}

            {user && (
              <PricingModal>
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white/70">
                  <Zap className="h-3 w-3 fill-white/70" />
                  {user.credits} credits
                </span>
              </PricingModal>
            )}

            <UserButton />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-[13px] font-medium text-white/50 hover:text-white/90 hover:bg-transparent"
              >
                Sign in
              </Button>
            </SignInButton>

            <SignInButton mode="modal">
              <Button
                size="sm"
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-black hover:bg-white/90 active:scale-95"
              >
                Get Started
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Button>
            </SignInButton>
          </Show>
        </div>
      </nav>
    </header>
  );
}
