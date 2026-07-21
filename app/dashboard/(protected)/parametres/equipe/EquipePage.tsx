"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Membre = { id: string; role: string; user: { name: string; email: string } };
type Invitation = { id: string; email: string; role: string | null; status: string };

export function EquipePage() {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("lecture");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const [membresRes, invitationsRes] = await Promise.all([
      authClient.organization.listMembers(),
      authClient.organization.listInvitations(),
    ]);
    if (membresRes.data) setMembres(membresRes.data.members as unknown as Membre[]);
    if (invitationsRes.data) setInvitations(invitationsRes.data as unknown as Invitation[]);
  }

  useEffect(() => {
    charger();
  }, []);

  async function inviter(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const { error } = await authClient.organization.inviteMember({ email, role: role as "admin" | "lecture" | "proprietaire" });
    setEnvoi(false);
    if (error) {
      setErreur(error.message ?? "Impossible d'inviter");
      return;
    }
    setEmail("");
    charger();
  }

  async function changerRole(memberId: string, nouveauRole: string) {
    await authClient.organization.updateMemberRole({ memberId, role: nouveauRole as "admin" | "lecture" | "proprietaire" });
    charger();
  }

  async function retirer(memberId: string) {
    if (!confirm("Retirer ce membre du tenant ?")) return;
    await authClient.organization.removeMember({ memberIdOrEmail: memberId });
    charger();
  }

  async function annulerInvitation(invitationId: string) {
    await authClient.organization.cancelInvitation({ invitationId });
    charger();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[23px] font-extrabold tracking-tight">Équipe</h1>
        <p className="text-[13.5px] text-kola-muted">Invite des collaborateurs, chacun avec le bon niveau d&apos;accès.</p>
      </div>

      <form onSubmit={inviter} className="flex items-end gap-3">
        <div className="flex-1">
          <Input type="email" placeholder="email@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lecture">Lecture</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="proprietaire">Propriétaire</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={envoi}>
          {envoi ? "Envoi..." : "Inviter"}
        </Button>
      </form>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
        {membres.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{m.user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-bold">{m.user.name}</div>
                <div className="text-xs text-kola-muted-light">{m.user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={m.role} onValueChange={(v) => changerRole(m.id, v)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="proprietaire">Propriétaire</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => retirer(m.id)}>
                Retirer
              </Button>
            </div>
          </div>
        ))}
      </div>

      {invitations.filter((i) => i.status === "pending").length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-kola-border bg-white">
          <div className="border-b border-kola-border bg-[#faf7ef] px-4.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#8b8474]">
            Invitations en attente
          </div>
          {invitations
            .filter((i) => i.status === "pending")
            .map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 border-b border-[#f4efe4] px-4.5 py-3 last:border-b-0">
                <div className="text-sm">{inv.email}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{inv.role}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => annulerInvitation(inv.id)}>
                    Annuler
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
