import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { OrderPage } from "@/features/checkout/components/OrderPage";
import { ensureOrder } from "@/features/checkout/queries";
import { requireUserId } from "@/lib/session/guards";

export const Route = createFileRoute("/orders/$orderId")({
  beforeLoad: ({ location }) => ({ userId: requireUserId(location) }),
  loader: async ({ context, params }) => {
    const order = await ensureOrder(context.queryClient, context.userId, params.orderId);
    if (!order) throw notFound();
  },
  notFoundComponent: OrderNotFound,
  component: OrderRoute,
});

function OrderRoute() {
  const { userId } = Route.useRouteContext();
  const { orderId } = Route.useParams();
  return <OrderPage key={`${userId}-${orderId}`} userId={userId} orderId={orderId} />;
}

function OrderNotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Pedido não encontrado</h1>
      <p>Este pedido não existe ou não está disponível para a sua conta.</p>
      <Link to="/" className="underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  );
}
