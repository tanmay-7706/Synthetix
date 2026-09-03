import { PrismaClient } from './lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Enabling Row Level Security (RLS) on tables...");
    
    // Enable RLS on all tables
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;`);
    console.log("RLS enabled on User table.");
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;`);
    console.log("RLS enabled on Workspace table.");
    
    await prisma.$executeRawUnsafe(`ALTER TABLE "Version" ENABLE ROW LEVEL SECURITY;`);
    console.log("RLS enabled on Version table.");

    console.log("Successfully fixed the Supabase security warning!");
  } catch (error) {
    console.error("Error enabling RLS:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
