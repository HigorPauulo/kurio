import { useNavigate } from "@tanstack/react-router";
import { useLogoutMutation } from "./queries";

export type Logout = { logout: () => Promise<void>; isPending: boolean };

export function useLogout(): Logout {
  const mutation = useLogoutMutation();
  const navigate = useNavigate();

  async function logout(): Promise<void> {
    if (mutation.isPending) return;
    await mutation.mutateAsync();
    await navigate({ to: "/" });
  }

  return { logout, isPending: mutation.isPending };
}
