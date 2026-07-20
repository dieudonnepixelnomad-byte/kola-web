"use client";

import { useState } from "react";

export function CopyButton({ message }: { message: string }) {
  const [copie, setCopie] = useState(false);

  async function handleClick() {
    await navigator.clipboard.writeText(message);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  return (
    <button
      onClick={handleClick}
      className={
        "flex-none whitespace-nowrap rounded-[9px] border px-3 py-1.5 text-xs font-bold transition-colors " +
        (copie
          ? "border-kola-accent bg-kola-actif-bg text-kola-accent-hover"
          : "border-kola-border bg-white text-kola-muted hover:border-kola-border-dark hover:text-kola-accent-hover")
      }
    >
      {copie ? "Copié ✓" : "Copier le message"}
    </button>
  );
}
