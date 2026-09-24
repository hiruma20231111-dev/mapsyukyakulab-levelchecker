// 新規診断発行ページ（営業専用）。
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { IntakeForm } from "@/features/intake/IntakeForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewDiagnosisPage() {
  const { sales } = await getSession();
  if (!sales) redirect("/?e=link");
  return (
    <main className="app">
      <IntakeForm salesName={sales.name} />
    </main>
  );
}
