import { NextResponse } from "next/server";
import { livrerWebhooksEnAttente } from "@/lib/webhooksSortants";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const resultat = await livrerWebhooksEnAttente();
  return NextResponse.json({ ok: true, ...resultat });
}
