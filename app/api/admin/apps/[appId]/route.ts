import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contexteTenant, TenantAuthError } from "@/lib/tenant";

export async function GET(_req: Request, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  let ctx;
  try {
    ctx = await contexteTenant();
  } catch (e) {
    if (e instanceof TenantAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const app = await prisma.app.findFirst({
    where: { id: appId, tenantId: ctx.tenantId },
    include: { offres: { orderBy: { createdAt: "desc" } } },
  });
  if (!app) return NextResponse.json({ error: "App introuvable" }, { status: 404 });

  const { cleApiSecreteHash: _hash, ...appSansHash } = app;
  return NextResponse.json({ app: appSansHash });
}
