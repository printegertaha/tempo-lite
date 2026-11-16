import "dotenv/config";
import prisma from "../lib/prisma";

async function main() {
  console.log("Checking prisma:", typeof prisma, prisma ? Object.keys(prisma) : "null");
  const p = (prisma as any).user ? prisma : (prisma as any).default || (prisma as any).prisma;
  const count = await p.user.count();
  console.log("User count in DB:", count);
  const users = await p.user.findMany({ select: { id: true, email: true, name: true } });
  console.log("Users:", users);
}

main().catch(console.error);
