# Freraut Invest — CLAUDE.md

## Proyecto
- **Repo:** `github.com/FrerautBot/frerautinvest-site` (branch: main)
- **Producción:** `frerautinvest.com` (Hostinger)
- **Stack:** React + Vite + Tailwind + Supabase + Recharts + Framer Motion
- **Dev:** `npm run dev` → `http://localhost:3000`
- **Build:** `npm run build` → carpeta `dist/`
- **Deploy:** `node deploy-hostinger.cjs` (requiere HOSTINGER_API_TOKEN, en PC de producción)

## Sistemas que NO debo romper

### 1. Sistema de Valor UE (UE Value)
- NAV en USD: `metricas_mercado.nav_actual`, `precio_actual_ue.precio_actual`
- No tocar RPCs: `procesar_compra_ue_con_ajuste`, `procesar_venta_ue_con_ajuste`
- Archivos clave: `src/components/Market.jsx`, `src/components/MarketDashboard.jsx`
- Tablas: `unidades_usuario`, `ordenes_ue`, `transacciones_billetera`

### 2. Sistema de Circulación de UEs
- RPCs intocables: `solicitar_retiro`, `cotizar_cambio_clp_usd`, `convertir_clp_a_usd`
- Archivos: `src/components/MyUnits.jsx` (retiros y cambios), `src/components/OfertasUEs.jsx`
- Tablas: `usuarios.saldo_clp`, `usuarios.saldo_usd`

### 3. Sistema de Valor Empresa
- Archivos: `src/components/Crecimiento.jsx`, `src/components/Pool.jsx`, `src/components/Portfolio.jsx`
- Tablas: `parametros_fondo.valor_base_clp`, `activos_cartera_fondo`

## Bug principal: CLP/USD mixing en patrimonio

### Causa raíz
La vista SQL `vista_patrimonio_usuario` en Supabase calcula:
```sql
patrimonio_total = saldo_clp + valor_total_ues
```
Donde `saldo_clp` está en CLP (ej: 500,000) y `valor_total_ues` es un número que representa USD (ej: 50,000 = 10,000 UEs × $5 USD/UE). Se suman monedas distintas sin convertir. Además, `saldo_usd` no se incluye en el cálculo.

Resultado: 500,000 CLP + 50,000 (tratado como CLP) = 550,000 → la UI muestra "$550,000 USD" cuando debiera ser ~$51,526 USD.

### Fix aplicado (frontend) — commit 7ae4ce5
En `Index.jsx` y `MyUnits.jsx` se sobreescribe el cálculo:
```
totalUSD = saldo_usd + valor_UEs + (saldo_clp / fxRate)
totalCLP = saldo_clp + (valor_UEs × fxRate) + (saldo_usd × fxRate)
```
- `MyUnits.jsx`: usa `saldoUSD`, `saldoCLP` (saldoDisponible), `lucro.valor_actual`
- `Index.jsx`: usa `saldo_usd` desde `usuarios` table + `valor_total_ues` desde vista

### Fix pendiente (DB)
Para arreglar la raíz, actualizar la vista `vista_patrimonio_usuario` y la RPC `obtener_historial_patrimonio` en Supabase con el cálculo correcto con fxRate e incluyendo `saldo_usd`.

### Archivos con bug CLP/USD
| Archivo | Líneas | Bug |
|---------|--------|------|
| `vista_patrimonio_usuario` (DB) | — | Suma CLP + USD sin convertir. Omite saldo_usd. |
| `obtener_historial_patrimonio` (DB) | — | Mismo error que la vista. |
| `src/components/Index.jsx` | formatCurrency (CLP) aplicado a valores USD (nav_actual, capital_total) |
| `src/components/PatrimonioChart.jsx` | Formatea CLP sobre datos de moneda desconocida. |
| `src/components/MarketDashboard.jsx` | `fC` formatea como CLP valores que son USD. |

## Reglas de trabajo
- **Siempre hacer commit** cada vez que se trabaje en Frerautinvest.com
- No destruir los 3 sistemas clave (Valor UE, Circulación UEs, Valor Empresa)
- Los cambios se pushean a GitHub, no deploy directo
- `git pull --rebase` antes de `git push` (por si hay cambios remotos)
- Testear en localhost:3000 antes de desplegar
- **MAPA-SISTEMAS.md** tiene el mapa completo de la arquitectura (ver ese archivo para detalle de cada sistema)
- **CONTEXTO.md** es el registro cronológico de todo lo que se ha hecho en el proyecto. Leerlo al inicio de cada sesión y actualizarlo al finalizar cada tarea.

## Rutas clave del proyecto
- `src/components/Index.jsx` — Dashboard principal con tarjeta Patrimonio Total
- `src/components/MyUnits.jsx` — Mis Unidades con tarjetas Patrimonio Actual/CLP
- `src/components/Market.jsx` — Mercado de UEs
- `src/components/Crecimiento.jsx` — Gestión de crecimiento del fondo
- `src/components/PatrimonioChart.jsx` — Chart de evolución del patrimonio
- `src/components/Pool.jsx` — Pool de inversión
- `src/lib/customSupabaseClient.js` — Cliente Supabase (URL + anon key)
- `src/contexts/SupabaseAuthContext.jsx` — Auth context
- `supabase/functions/analyze-freraut/index.ts` — Edge function de análisis

## Tablas/views Supabase importantes
- `vista_patrimonio_usuario` — Vista con bug (saldo_clp, valor_total_ues, patrimonio_total)
- `usuarios` — saldo_clp (CLP), saldo_usd (USD)
- `metricas_mercado` — nav_actual (USD), capital_total_invertido (USD)
- `precio_actual_ue` — precio_actual (USD/UE), capital_total (USD)
- `fx_config` — manual_rate (tipo de cambio USD/CLP)
- `unidades_usuario` — Tenencias de UEs
- `parametros_fondo` — valor_base_clp (CLP)
- `nav_historico` — Historial de NAV
