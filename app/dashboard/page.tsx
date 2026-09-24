// 営業ダッシュボード。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { listLeadsBySales, getEffectiveGoal, monthKey } from "@/lib/store/store";
import { SalesDashboard } from "@/features/sales/SalesDashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { sales } = await getSession();
  if (!sales) redirect("/?e=link");
  const ym = monthKey();
  const [leads, goal] = await Promise.all([
    listLeadsBySales(sales.id),
    getEffectiveGoal(sales.id, ym),
  ]);
  return (
    <main className="app">
      <SalesDashboard salesName={sales.name} initialLeads={leads} monthGoal={goal} ym={ym} />
    </main>
  );
}
