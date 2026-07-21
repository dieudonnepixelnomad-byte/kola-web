import { NextResponse } from "next/server";
import { avancerAbonnements, reconcilierTransactionsEnAttente } from "@/lib/stateMachine";
import { synchroniserDogfooding } from "@/lib/dogfooding";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const relance = await avancerAbonnements();
  const reconcilies = await reconcilierTransactionsEnAttente();
  const dogfooding = await synchroniserDogfooding();

  return NextResponse.json({ ok: true, ...relance, reconcilies, dogfooding });
}
