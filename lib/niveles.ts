export type Nivel = "Bronce" | "Plata" | "Oro";

/** Umbrales de nivel por score (editables). */
export const UMBRALES_NIVEL = { plata: 50, oro: 75 };

export function nivelDe(score: number): Nivel {
  return score >= UMBRALES_NIVEL.oro ? "Oro" : score >= UMBRALES_NIVEL.plata ? "Plata" : "Bronce";
}
