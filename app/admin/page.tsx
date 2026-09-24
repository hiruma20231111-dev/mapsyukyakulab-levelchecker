// 管理者ボード。
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { listSales, listAllLeads, getSettings, getEffectiveGoal, monthKey } from "@/lib/store/store";
import { AdminBoard } from "@/features/admin/AdminBoard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { isAdmin } = await getSession();
  if (!isAdmin) redirect("/?e=admin");

  const ym = monthKey();
  const [sales, leads, settings] = await Promise.all([listSales(), listAllLeads(), getSettings()]);
  const goalsEntries = await Promise.all(sales.map(async (s) => [s.id, await getEffectiveGoal(s.id, ym)] as const));
  const initialGoals = Object.fromEntries(goalsEntries);

  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("host") || "";
  const origin = host ? `${proto}://${host}` : "";

  const salesWithLink = sales.map((s) => ({ id: s.id, name: s.name, accountLink: `/s/${s.token}`, active: s.active }));

  return (
    <main className="app" style={{ maxWidth: "none" }}>
      <AdminBoard
        initialSales={salesWithLink}
        leads={leads}
        settings={settings}
        initialGoals={initialGoals}
        ym={ym}
        origin={origin}
      />
    </main>
  );
}
