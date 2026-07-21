"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function AccepterInvitation({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  async function accepter() {
    setChargement(true);
    setErreur(null);
    const { error } = await authClient.organization.acceptInvitation({ invitationId });
    setChargement(false);
    if (error) {
      setErreur(error.message ?? "Impossible d'accepter l'invitation");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div>
      {erreur && <p className="mb-4 text-sm text-red-600">{erreur}</p>}
      <button
        onClick={accepter}
        disabled={chargement}
        className="w-full rounded-xl bg-kola-accent px-4 py-3.5 text-[15px] font-bold text-white shadow-[0_6px_16px_-6px_#12a05e88] transition-colors hover:bg-kola-accent-hover disabled:opacity-50"
      >
        {chargement ? "Patiente..." : "Accepter l'invitation"}
      </button>
    </div>
  );
}
