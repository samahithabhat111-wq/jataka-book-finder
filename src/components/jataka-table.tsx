import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { StatusBadge, StatusDot, type JatakaStatus } from "@/components/status-badge";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type JatakaRow = {
  id: string;
  jataka_number: string;
  client_name: string | null;
  date_of_birth: string;
  time_of_birth: string;
  father_name: string | null;
  mother_name?: string | null;
  phone: string | null;
  place: string | null;
  status: JatakaStatus;
  created_at: string;
};

const dash = (v: string | null | undefined) => v || "—";

// Collected records stay fully readable, just slightly faded.
const fade = (r: JatakaRow) => (r.status === "collected" ? "opacity-70" : "");

export function JatakaTable({ rows }: { rows: JatakaRow[] }) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              {["Status", "Jataka Number", "Name", "DOB", "TOB", "Father's Name", "Phone", "Place"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-b last:border-0 hover:bg-muted/40 transition-colors", fade(r))}>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 font-mono font-semibold">
                  <Link to="/jatakas/$id" params={{ id: r.id }} className="text-primary hover:underline">{r.jataka_number}</Link>
                </td>
                <td className="px-4 py-3 font-medium">{dash(r.client_name)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.date_of_birth)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{fmtTime(r.time_of_birth)}</td>
                <td className="px-4 py-3">{dash(r.father_name)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{dash(r.phone)}</td>
                <td className="px-4 py-3">{dash(r.place)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to="/jatakas/$id"
              params={{ id: r.id }}
              className={cn("flex items-center gap-3 px-1 py-3 active:bg-muted/60", fade(r))}
            >
              <StatusDot status={r.status} className="h-3.5 w-3.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold">{r.jataka_number}</span>
                  <span className="truncate font-medium">{dash(r.client_name)}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {fmtDate(r.date_of_birth)} · {fmtTime(r.time_of_birth)}
                  {r.phone ? ` · ${r.phone}` : ""}
                  {r.father_name ? ` · ${r.father_name}` : ""}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
