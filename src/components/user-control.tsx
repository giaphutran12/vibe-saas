"use client";
import { dark } from "@clerk/themes";
import { useCurrentTheme } from "@/hooks/use-current-theme";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface Props {
  showName?: boolean;
}
export const UserControl = ({ showName }: Props) => {
  const currentTheme = useCurrentTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />;
  }

  return (
    <UserButton
      showName={showName}
      appearance={{
        elements: {
          userButtonBox: "rounded-md!",
          userButtonAvatarBox: "rounded-md! size-8!",
          userButtonTrigger: "rounded-md!",
        },
        theme: currentTheme === "dark" ? dark : undefined,
      }}
    />
  );
};
