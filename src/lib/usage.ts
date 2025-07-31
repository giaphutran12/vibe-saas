import { RateLimiterPrisma } from "rate-limiter-flexible";
import { prisma } from "./db";
import { auth } from "@clerk/nextjs/server";

const GENERATION_COST = 1;
const FREE_POINTS = 2;
const PRO_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60;
export async function getUsageTracker() {
  const { has } = await auth();
  const hasProAccess = has({ plan: "pro" });
  const usageTracker = new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points: hasProAccess ? PRO_POINTS : FREE_POINTS,
    duration: DURATION, //30 days
  });
  return usageTracker;
}

export async function initializeUserUsage() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  // Check if usage record exists
  const existingUsage = await prisma.usage.findUnique({
    where: { key: userId },
  });

  if (!existingUsage) {
    // Create initial usage record with FREE_POINTS
    await prisma.usage.create({
      data: {
        key: userId,
        points: FREE_POINTS,
        expire: new Date(Date.now() + DURATION * 1000),
      },
    });
  }
}

export async function consumeCredits() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.consume(userId, GENERATION_COST);
}

export async function getUsageStatus() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }
  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);
  return result;
}
