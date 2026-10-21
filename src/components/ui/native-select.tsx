import * as React from "react"
import { cn } from "@/lib/utils"

import { ChevronDownIcon } from "@/components/icons/KurioIcons"

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div data-slot="native-select-wrapper" className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-10 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-background py-2 pr-9 pl-3 text-base text-foreground md:text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground" />
    </div>
  )
}

export { NativeSelect }
