# Reglas de negocio (prototipo)

- Tramos (`lib/reglas.ts`): 1–15 días → máx. 2 cuotas, 0% inicial · 16–30 → 3 cuotas, 0% (score ≥ 60) o 10% (< 60) · 31–60 → 4 cuotas, 20% · > 60 → se deriva a gestor con inicial ≥ 30%.
- Cada cuota ≥ S/ 20. Una sola reprogramación activa por crédito. Si una propuesta no cumple, siempre se ofrece la alternativa más cercana (`contrapropuesta`).
- Aceptar un plan **no** detiene el CHICOTAZO: recién el primer pago del plan lo detiene.
- Incumplir un plan: vuelve el CHICOTAZO diario y el cliente pierde beneficios y la opción de reprogramar (sin castigo fijo de puntos).
- Regalo Salvador (lo otorga el gestor): paga hoy 30% menos y recupera el descuento con +10% en sus 3 cuotas siguientes; vence en 7 días; al usarlo recupera beneficios.
- Score 0–100 (parte en 70): trivia +2 (tope +10/día), racha +5 (solo al día), pago a tiempo +15, plan cumplido +20, CHICOTAZO −12 por día en mora.
- Toda regla nueva va con su test en `tests/`.
