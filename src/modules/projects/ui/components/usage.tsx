import Link from "next/link";
import { CrownIcon, Divide } from "lucide-react";

import { formatDuration, intervalToDuration } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import { err } from "inngest/types";

interface Props {
  points: number;
  msBeforeNext: number;
}

export const Usage = ({ points, msBeforeNext }: Props) => {
  const resetTime = useMemo(() => {
    try {
      return formatDuration(
        intervalToDuration({
          start: new Date(),
          end: new Date(Date.now() + msBeforeNext),
        }),
        { format: ["months", "days", "hours"] }
      );
    } catch (error) {
      console.error("Error formatting duration", error);
      return "unknown";
    }
  }, [msBeforeNext]);
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });
  return (
    <div className="rounded-t-xl bg-background border border-b-0 p-2.5">
      <div className="flex items-center gap-x-2">
        <p className="text-sm">
          You have {points} {hasProAccess ? "" : "free"} credits left
        </p>
        <p className="text-xs text-muted-foreground">Resets in {resetTime}</p>
      </div>
      {!hasProAccess && (
        <Button asChild size={"sm"} variant={"tertiary"} className="ml-auto">
          <Link href="/pricing">
            <CrownIcon /> Upgrade
          </Link>
        </Button>
      )}
    </div>
  );
};
