import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { JatakaListPage } from "@/components/jataka-list-page";

export const Route = createFileRoute("/_authenticated/jatakas/")({
  head: () => ({ meta: [{ title: "All Jatakas — Shri Ganesha Jyotishyalaya" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page) > 0 ? Math.floor(Number(s.page)) : 1,
    status: typeof s.status === "string" && s.status ? s.status : undefined,
  }),
  component: AllJatakas,
});

function AllJatakas() {
  const { page, status } = Route.useSearch();
  const navigate = useNavigate({ from: "/jatakas/" });
  return (
    <JatakaListPage
      title="All Jatakas"
      description="Every Jataka in the index. Ready first, then Preparing, then Collected."
      sort="status"
      status={status}
      page={page}
      onPage={(p) => navigate({ search: (prev) => ({ ...prev, page: p }) })}
      onStatus={(s) => navigate({ search: () => ({ page: 1, status: s || undefined }) })}
    />
  );
}
