import { NextResponse } from "next/server";
import { avancerAbonnements, reconcilierTransactionsEnAttente } from "@/lib/stateMachine";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const relance = await avancerAbonnements();
  const reconcilies = await reconcilierTransactionsEnAttente();

  return NextResponse.json({ ok: true, ...relance, reconcilies });
}
