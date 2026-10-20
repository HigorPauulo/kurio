import { createFileRoute, Link, notFound, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/features/cart/components/AddToCartButton";
import { NftDetailPage } from "@/features/catalog/components/NftDetailPage";
import { ensureNft } from "@/features/catalog/queries";

export const Route = createFileRoute("/nft/$nftId")({
  validateSearch: z.object({ edition: z.string().optional().catch(undefined) }),
  loader: async ({ context, params }) => {
    const nft = await ensureNft(context.queryClient, params.nftId);
    if (!nft) throw notFound();
  },
  notFoundComponent: NftNotFound,
  errorComponent: NftLoadError,
  component: NftRoute,
});

function NftRoute() {
  const { nftId } = Route.useParams();
  const { edition } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <NftDetailPage
      nftId={nftId}
      editionId={edition}
      onEditionChange={(next) => void navigate({ search: { edition: next }, replace: true })}
      renderPurchase={(selection) => <AddToCartButton key={selection.editionId} {...selection} />}
    />
  );
}

function NftNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col items-start gap-4 px-4 pt-16">
      <h1 className="text-2xl font-bold">NFT não encontrado</h1>
      <p>Este NFT não existe ou saiu do catálogo.</p>
      <Link to="/" className="text-text-accent underline underline-offset-4">
        Voltar ao catálogo
      </Link>
    </main>
  );
}

function NftLoadError({ reset }: ErrorComponentProps) {
  const router = useRouter();

  function handleRetry(): void {
    reset();
    void router.invalidate();
  }

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col items-start gap-4 px-4 pt-16">
      <h1 className="text-2xl font-bold">Não foi possível carregar o NFT</h1>
      <p role="alert">Verifique a conexão e tente de novo.</p>
      <Button onClick={handleRetry}>Tentar de novo</Button>
    </main>
  );
}
