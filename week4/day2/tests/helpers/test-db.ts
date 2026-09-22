import { prisma } from "@/server/db/prisma";

export async function resetDatabase() {
  try {
    // Delete in reverse order of foreign key dependencies
    await prisma.membership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn("Could not truncate live database. Using fallback reset.", error);
  }
}
