// 新規診断発行ページ（営業専用）。?edit=<leadId> で既存リードの編集/診断追加もできる。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLead } from "@/lib/store/store";
import { IntakeForm, type IntakeInitial } from "@/features/intake/IntakeForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewDiagnosisPage({ searchParams }: { searchParams: { edit?: string } }) {
  const { sales } = await getSession();
  if (!sales) redirect("/?e=link");

  let initial: IntakeInitial | undefined;
  const editId = searchParams?.edit;
  if (editId) {
    const lead = await getLead(editId);
    // 自分が発行したリードのみ編集可。
    if (lead && lead.salesId === sales.id) {
      initial = {
        id: lead.id,
        storeName: lead.storeName,
        placeId: lead.placeId ?? "",
        descText: lead.descText ?? "",
        answers: lead.answers ?? {},
      };
    }
  }

  return (
    <main className="app">
      <IntakeForm salesName={sales.name} initial={initial} />
    </main>
  );
}
