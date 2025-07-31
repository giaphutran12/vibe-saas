import { getUsageStatus, initializeUserUsage } from "@/lib/usage";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
export const usageRouter = createTRPCRouter({
  status: protectedProcedure.query(async () => {
    try {
      const result = await getUsageStatus();
      console.log("Usage status result:", result);

      // If no usage record exists, initialize it
      if (!result) {
        console.log("No usage record found, initializing...");
        await initializeUserUsage();
        const newResult = await getUsageStatus();
        console.log("New usage status result:", newResult);
        return newResult;
      }

      return result;
    } catch (error) {
      console.error("Usage status error:", error);
      return null;
    }
  }),
});
