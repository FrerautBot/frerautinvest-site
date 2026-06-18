# CONTEXTO.md — Freraut Invest

Registro cronológico de cambios, bugs y decisiones del proyecto.

---

## 2026-06-17 — Fix patrimonio: CLP/USD mixing

**Bug:** La vista SQL `vista_patrimonio_usuario` suma `saldo_clp` (CLP) + `valor_total_ues` (cifra en USD) sin convertir. Ignora `saldo_usd`. Resultado: muestra $550,000 USD cuando debiera ser ~$51,526 USD.

**Fix frontend (commit `7ae4ce5`):**
- `src/components/Index.jsx`: Nuevo cálculo en frontend que lee `saldo_usd`, `saldo_clp`, `valor_total_ues` y aplica fxRate
- `src/components/MyUnits.jsx`: PatrimonioChart ahora recibe `lucro`, `saldoCLP`, `saldoUSD` y calcula total correctamente

**Archivos creados:**
- `MAPA-SISTEMAS.md` — Mapa de arquitectura con todos los sistemas, archivos y funciones
- `CLAUDE.md` — Instrucciones permanentes para el agente

**Pendiente (DB):** Actualizar `vista_patrimonio_usuario` y `obtener_historial_patrimonio` en Supabase con cálculo correcto.

**Preview:** `http://localhost:3000` corriendo con el build nuevo.
