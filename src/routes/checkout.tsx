import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CheckoutPage } from "@/features/checkout/components/CheckoutPage";
import { requireUserId } from "@/lib/session/guards";

export const Route = createFileRoute("/checkout")({
  validateSearch: z.object({ step: z.enum(["review"]).optional().catch(undefined) }),
  beforeLoad: ({ location }) => ({ userId: requireUserId(location) }),
  component: CheckoutRoute,
});

function CheckoutRoute() {
  const { userId } = Route.useRouteContext();
  const { step } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CheckoutPage
      key={userId}
      userId={userId}
      step={step ?? "details"}
      onStepChange={(next) => void navigate({ search: { step: next === "review" ? "review" : undefined } })}
      onOrderPlaced={(orderId) => void navigate({ to: "/orders/$orderId", params: { orderId }, replace: true })}
    />
  );
}
