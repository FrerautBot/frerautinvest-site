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

---

## 2026-06-18 — DiseñoFreraut: landing page completa + 50+ fixes

**Landing page (`src/pages/HomePage.jsx`):**
- DiseñoFreraut aplicado con paleta institucional (gold #C9A227, bg #0B0C10, panel #F5F1E8)
- Hero con badge "Patrimonio Privado", panel informativo NAV ($5.24 USD), indicadores de confianza
- Sección Servicios (6 cards: Gestión Patrimonio, Mercado UEs, Lake Intelligence, Portafolio, Gobierno Corp, Reportes)
- Sección Cómo Funciona (4 pasos: Crear Cuenta → Depositar → Adquirir UEs → Seguir Inversión)
- Sección Estadísticas ($2.4M+, 52 inversores, +18.4%, 4 años)
- Sección Testimonios (3 inversores)
- CTA con "Crear Cuenta Gratis" y "Contactar" (mailto)
- Footer expandido 3 columnas (brand + LinkedIn/Twitter, servicios, contacto + horario)
- SEO meta tags (Helmet, OG, Twitter Card)

**Fixes aplicados (50+ workers):**
- Stagger animations corregidas (framer-motion hidden/visible keys)
- WCAG AA: muted #9C9C9C (ratio 5.25:1)
- Border-radius reducido a max 16px en cards (index.css)
- Menú mobile con backdrop overlay y aria-expanded
- a11y en Market.jsx (htmlFor, role=tab, aria-selected, aria-modal, autoFocus)
- Scroll-behavior con restore, overflow-x-hidden
- Icon imports limpios, easing corregido, texto con caracteres chinos reparado

**Commit:** `e8c7338` — push a GitHub main
