import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireCurrentUser() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
