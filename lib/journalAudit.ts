import { prisma } from "./prisma";
import type { ContexteTenant } from "./tenant";

export async function enregistrerAction(
  ctx: ContexteTenant,
  { action, cible, meta }: { action: string; cible?: string; meta?: Record<string, unknown> }
) {
  await prisma.journalAudit.create({
    data: {
      tenantId: ctx.tenantId,
      utilisateurId: ctx.userId,
      action,
      cible,
      meta: meta as never,
    },
  });
}
