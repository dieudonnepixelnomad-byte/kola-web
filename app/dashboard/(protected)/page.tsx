import { headers } from "next/headers";

type Compteurs = {
  ACTIF: number;
  TOLERANCE: number;
  COUPE: number;
  EXPIRE: number;
  aRelancer: number;
};

async function getCompteurs(): Promise<Compteurs> {
  const h = await headers();
  const host = h.get("host");
  const protocole = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${protocole}://${host}/api/admin/compteurs`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!res.ok) return { ACTIF: 0, TOLERANCE: 0, COUPE: 0, EXPIRE: 0, aRelancer: 0 };
  return res.json();
}

export default async function DashboardPage() {
  const compteurs = await getCompteurs();

  const kpis = [
    { label: "Actifs", valeur: compteurs.ACTIF, sub: "accès ouvert", fg: "#12a05e" },
    { label: "À relancer", valeur: compteurs.aRelancer, sub: "message à envoyer (J-3/J+7)", fg: "#e6a52b" },
    { label: "En tolérance", valeur: compteurs.TOLERANCE, sub: "accès maintenu", fg: "#d9902a" },
    { label: "Coupés", valeur: compteurs.COUPE, sub: "accès fermé", fg: "#d95a3a" },
    { label: "Expirés", valeur: compteurs.EXPIRE, sub: "cycle terminé", fg: "#a99f8c" },
  ];

  const legend = [
    { label: "Actifs", color: "#12a05e", value: compteurs.ACTIF },
    { label: "En tolérance", color: "#e6a52b", value: compteurs.TOLERANCE },
    { label: "Coupés", color: "#d95a3a", value: compteurs.COUPE },
    { label: "Expirés", color: "#a99f8c", value: compteurs.EXPIRE },
  ];
  const total = legend.reduce((s, l) => s + l.value, 0) || 1;

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        <h1 className="mb-0.5 text-[23px] font-extrabold tracking-tight">
          Vue d&apos;ensemble
        </h1>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-[15px] border border-kola-border bg-white p-4"
          >
            <div
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ background: k.fg }}
            />
            <div className="mb-2 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: k.fg }}
              />
              <span className="text-xs font-semibold text-kola-muted">{k.label}</span>
            </div>
            <div className="text-[29px] font-extrabold leading-none tracking-tight tabular-nums">
              {k.valeur}
            </div>
            <div className="mt-1.5 text-[11.5px] text-kola-muted-light">{k.sub}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-kola-border bg-white p-4.5 lg:max-w-md">
        <h2 className="mb-1 text-[15px] font-extrabold">Répartition du portefeuille</h2>
        <p className="mb-4 text-xs text-kola-muted-light">{total} abonné(s) suivi(s) au total</p>
        <div className="mb-5 flex h-3 overflow-hidden rounded-full">
          {legend.map((l) => (
            <div
              key={l.label}
              style={{ width: `${(l.value / total) * 100}%`, background: l.color }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 flex-none rounded-[3px]"
                style={{ background: l.color }}
              />
              <span className="flex-1 text-sm font-semibold">{l.label}</span>
              <span className="text-sm font-extrabold tabular-nums">{l.value}</span>
              <span className="w-[42px] text-right text-xs text-kola-muted-light">
                {Math.round((l.value / total) * 100)} %
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
