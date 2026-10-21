import { Star } from "lucide-react";
import type { JSX } from "react";
import { cn } from "@/lib/utils";

export function Stars({ value, className }: { value: number; className?: string }): JSX.Element {
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, star) => {
        const fill = Math.min(Math.max(value - star, 0), 1) * 100;
        return (
          <span key={star} className={cn("relative size-3.5", className)}>
            <Star className="absolute inset-0 size-full fill-secondary-base/50 text-secondary-base/50" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className={cn("size-3.5 fill-primary text-primary", className)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
