import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const user = await loadUser();
    throw redirect({ to: user ? "/dashboard" : "/auth" });
  },
  component: () => null,
});
