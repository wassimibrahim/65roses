import { requireUser } from "@/lib/rbac";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Distraction-free layout for the investment committee screen and the printed
 * memo. Authentication still applies; the navigation does not — these are
 * surfaces you put on a boardroom monitor or on paper.
 */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-ivory">{children}</div>
    </TooltipProvider>
  );
}
