import { createFileRoute, redirect } from "@tanstack/react-router";
import { JatakaForm } from "@/components/jataka-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/jatakas/new")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Add New Jataka — Shri Ganesha Jyotishyalaya" }] }),
  component: NewJataka,
});

function NewJataka() {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Add New Jataka</CardTitle>
      </CardHeader>
      <CardContent>
        <JatakaForm />
      </CardContent>
    </Card>
  );
}
