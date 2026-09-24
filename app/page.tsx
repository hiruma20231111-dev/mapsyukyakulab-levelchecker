// 入口。アカウントリンク方式のため、ここでは案内のみ（ログインフォームは持たない）。
export const dynamic = "force-dynamic";

export default function Home({ searchParams }: { searchParams: { e?: string } }) {
  const e = searchParams?.e;
  const msg =
    e === "link"
      ? "アカウントリンクが無効か、有効期限が切れています。管理者にお問い合わせください。"
      : e === "admin"
        ? "管理者リンクが正しくありません。"
        : "";
  return (
    <main className="app" style={{ padding: "56px 22px", textAlign: "center" }}>
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 16 }}>
        <i style={{ width: 11, height: 11, borderRadius: 3, background: "var(--g-blue)" }} />
        <i style={{ width: 11, height: 11, borderRadius: 3, background: "var(--g-yellow)" }} />
        <i style={{ width: 11, height: 11, borderRadius: 3, background: "var(--g-green)" }} />
        <i style={{ width: 11, height: 11, borderRadius: 3, background: "var(--g-red)" }} />
      </div>
      <p style={{ fontSize: 19, fontWeight: 900, color: "var(--ink)", marginBottom: 6 }}>
        マップ集客ラボ
        <br />
        レベルチェッカー
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
        GoogleマップMEOの無料診断を発行し、
        <br />
        お客様の集客レベルをその場で可視化する営業ツールです。
      </p>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 22 }}>
        ご利用は、管理者から受け取った
        <br />
        <b style={{ color: "var(--ink)" }}>アカウントリンク</b>からアクセスしてください。
      </p>
      {msg && (
        <p
          style={{
            marginTop: 22,
            fontSize: 12.5,
            fontWeight: 700,
            color: "#a23b30",
            background: "#fdeceb",
            border: "1px solid #f4cfcb",
            borderRadius: 10,
            padding: "11px 14px",
          }}
        >
          {msg}
        </p>
      )}
    </main>
  );
}
