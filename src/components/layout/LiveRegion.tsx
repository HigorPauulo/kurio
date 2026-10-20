import type { JSX } from "react";
import { useAnnouncement } from "@/lib/a11y/announcer";

export function LiveRegion(): JSX.Element {
  const announcement = useAnnouncement();
  const polite = announcement?.politeness === "polite" ? announcement : null;
  const assertive = announcement?.politeness === "assertive" ? announcement : null;

  return (
    <div className="sr-only">
      <div aria-live="polite" aria-atomic="true">
        {polite && <p key={polite.id}>{polite.message}</p>}
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {assertive && <p key={assertive.id}>{assertive.message}</p>}
      </div>
    </div>
  );
}
