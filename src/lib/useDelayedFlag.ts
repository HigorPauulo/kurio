import { useEffect, useState } from "react";

export function useDelayedFlag(isActive: boolean, delayMs: number): boolean {
  const [isElapsed, setIsElapsed] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const timer = setTimeout(() => setIsElapsed(true), delayMs);
    return () => {
      clearTimeout(timer);
      setIsElapsed(false);
    };
  }, [isActive, delayMs]);

  return isActive && isElapsed;
}
