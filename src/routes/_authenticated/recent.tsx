import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { JatakaListPage } from "@/components/jataka-list-page";

export const Route = createFileRoute("/_authenticated/recent")({
  head: () => ({ meta: [{ title: "Recent Entries — Shri Ganesha Jyotishyalaya" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    page: Number(s.page) > 0 ? Math.floor(Number(s.page)) : 1,
  }),
  component: Recent,
});

function Recent() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: "/recent" });
  return (
    <JatakaListPage
      title="Recent Entries"
      description="Most recently added Jatakas first."
      sort="recent"
      page={page}
      onPage={(p) => navigate({ search: { page: p } })}
    />
  );
}
