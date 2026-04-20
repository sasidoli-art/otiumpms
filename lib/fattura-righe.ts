/**
 * Helper per creare e normalizzare le righe fattura.
 *
 * Durante la migrazione dal campo JSON al modello RigaFattura, queste funzioni
 * producono simultaneamente entrambe le rappresentazioni per retrocompatibilità.
 */

export type RigaInput = {
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  iva: number; // aliquota percentuale
  naturaEsenzione?: string | null;
  categoria?: string | null;
};

export type RigaNormalizzata = RigaInput & {
  totale: number;
};

export function normalizzaRighe(righe: RigaInput[]): RigaNormalizzata[] {
  return righe.map((r) => ({
    ...r,
    totale: round2(r.quantita * r.prezzoUnitario),
  }));
}

export function calcolaTotali(righe: RigaNormalizzata[]): {
  imponibile: number;
  iva: number;
  totale: number;
} {
  const imponibile = round2(righe.reduce((s, r) => s + r.totale, 0));
  const ivaAmount = round2(righe.reduce((s, r) => s + r.totale * (r.iva / 100), 0));
  const totale = round2(imponibile + ivaAmount);
  return { imponibile, iva: ivaAmount, totale };
}

/**
 * Costruisce il payload Prisma per creare una fattura con righe relazionali
 * + legacy JSON. Usa questo nei `prisma.fattura.create({ data: ... })`.
 */
export function buildRigheCreatePayload(righe: RigaNormalizzata[]) {
  const righeJson = righe.map((r) => ({
    descrizione: r.descrizione,
    quantita: r.quantita,
    prezzoUnitario: r.prezzoUnitario,
    iva: r.iva,
    totale: r.totale,
  }));
  return {
    righe: righeJson as unknown as import('@prisma/client').Prisma.InputJsonValue,
    rigeRel: {
      create: righe.map((r, i) => ({
        ordine: i,
        descrizione: r.descrizione,
        quantita: r.quantita,
        prezzoUnitario: r.prezzoUnitario,
        aliquotaIva: r.iva,
        totale: r.totale,
        naturaEsenzione: r.naturaEsenzione ?? null,
        categoria: r.categoria ?? null,
      })),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
